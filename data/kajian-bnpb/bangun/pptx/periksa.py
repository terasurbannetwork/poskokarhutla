#!/usr/bin/env python3
"""Gerbang mekanis deck PPTX dan PDF-nya (Buku Pegangan, Alur kerja langkah 4; PEDOMAN D-1 sampai D-4, D-8, D-9,
D-10, D-17, D-22, D-24) dan uji diri.

    ../../.venv/bin/python periksa.py                         # uji diri: bangun dua spek + PDF, gerbang lolos, fixture rusak ditolak
    ../../.venv/bin/python periksa.py --serah keluaran/X.pptx  # sebelum menyerahkan: gerbang PPTX + PDF + cek basi
    from periksa import periksa; periksa(pptx, tema, pdf)      # manifest dibaca dari <pptx>.manifest.json

Yang diukur dari berkas jadi, bukan dari catatan generator: teks, font, warna, dan nomor halaman dari XML slide;
font (pdffonts) dan jumlah baris judul dari PDF. Manifest generator dipakai untuk asal angka, peran warna (D-24, PEDOMAN
B1.8), dan unsur peta (D-8), seperti yang diminta PEDOMAN. Pesan gagal menyebut kode, slide, nilai, dan ambang.
Berhenti di pelanggaran pertama.
"""
import copy
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

from pptx import Presentation

SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI))
from deck import REPO, RE_BOLEH, E, berkas_font  # noqa: E402

RE_HEX = re.compile(r'#[0-9A-Fa-f]{6}\b')
RE_ANGKA = re.compile(r'\d+(?:[.,]\d+)*')
RE_WARNA_LAIN = re.compile(r'<a:(schemeClr|prstClr|sysClr|scrgbClr|hslClr)\b[^>]*>')


def hex_tema(t):
    """Daftar putih D-9: semua hex di blok warna tema.json, tanpa daftar terlarang."""
    w = dict(t['warna'])
    w.pop('terlarang', None)
    return {h[1:].upper() for h in RE_HEX.findall(json.dumps(w))}


def no_spek(asal):
    """'spek-x#8.2' / 'spek-x#8/data' -> '8': nomor slide di spek, kunci yang dipakai manifest angka."""
    return re.split(r'[./]', asal.rsplit('#', 1)[1])[0]


def manifest(pptx):
    p = Path(pptx).with_suffix('.manifest.json')
    assert p.exists(), f'{p.name} tidak ada; bangun ulang dengan deck.py'
    return json.loads(p.read_text(encoding='utf-8'))


def basi(man):
    """Berkas masukan yang berubah (atau hilang) sesudah deck dibangun."""
    return [b for b, h in man['masukan'].items() if not (REPO / b).exists() or hashlib.sha256((REPO / b).read_bytes()).hexdigest() != h]


def d24(t, warna_hal, lok):
    """Satu hex satu arti per halaman (PEDOMAN B1.8): kelas peran kategori, skala, permukaan, aksen tidak bercampur pada
    satu hex; di halaman berkeluarga api/basah arah memakai teks-2 (B1.5), dan bila api tampil angka judul navy."""
    kelas, peran = {}, {}
    for hx, p in warna_hal:
        k = ('kategori' if p.startswith('kategori.') else 'skala' if p.startswith('skala.') else
             'permukaan' if p in ('permukaan', 'garis') else None if p in ('inti', 'pil') else 'aksen')
        if k:
            kelas.setdefault(hx, set()).add(k)
            peran.setdefault(hx, set()).add(p)
    for hx, ks in kelas.items():
        assert len(ks) <= 1, f'D-24 {lok}: hex #{hx} membawa dua arti {sorted(peran[hx])} di satu halaman (PEDOMAN B1.8)'
    sk = t['warna']['skala']
    kel = {p.split('.')[1] for _, p in warna_hal if p.startswith('kategori.')}
    kel |= {sk[p.split('.')[1]].get('kategori') for _, p in warna_hal if p.startswith('skala.')}
    hx = lambda tok: (t['warna']['inti'].get(tok) or t['warna']['aksen'].get(tok))['hex'][1:]
    if kel & {'api', 'basah'}:
        sah = {hx(t['warna']['arah']['berkeluarga']), hx(t['warna']['arah']['nol'])}
        salah = {h for h, p in warna_hal if p == 'arah'} - sah
        assert not salah, f'D-24 {lok}: halaman berkeluarga {sorted(kel & {"api", "basah"})}, arah #{sorted(salah)} harus teks-2 (B1.5, B1.8)'
    if 'api' in kel:
        salah = {h for h, p in warna_hal if p == 'angka-judul'} - {hx('navy')}
        assert not salah, f'D-24 {lok}: kategori atau ramp api tampil, angka judul #{sorted(salah)} harus navy (B1.8)'


def d8(t, pt, lok):
    """Unsur peta dari manifest perender (PEDOMAN B5.9, D-8): legenda, sumber batas, sistem referensi, catatan batas tidak
    resmi, label >= 8 pt, label di dalam peta dan tanpa irisan."""
    un = pt.get('unsur_peta') or {}
    assert pt.get('legenda'), f'D-8 {lok}: peta tanpa legenda'
    assert un.get('sumber_batas') and un.get('sistem_referensi'), f'D-8 {lok}: unsur peta tanpa sumber batas atau sistem referensi'
    assert pt['resmi'] or un.get('catatan'), f'D-8 {lok}: batas bukan rujukan resmi tanpa catatan "Batas wilayah bukan rujukan resmi"'
    assert pt['ukuran_label_pt'] >= 8, f'D-8 {lok}: label peta {pt["ukuran_label_pt"]} pt < 8 pt'
    bx = pt['batas']
    lab = pt['label']
    for i, a in enumerate(lab):
        k = a['kotak']
        assert bx[0] <= k[0] and bx[1] <= k[1] and k[2] <= bx[2] and k[3] <= bx[3], f'D-8 {lok}: label "{a["teks"]}" keluar dari peta'
        for b in lab[i + 1:]:
            m = b['kotak']
            assert not (k[0] < m[2] and m[0] < k[2] and k[1] < m[3] and m[1] < k[3]), f'D-8 {lok}: label "{a["teks"]}" beririsan dengan "{b["teks"]}"'


def periksa(pptx, t, pdf=None):
    man = manifest(pptx)
    hal = man['slide']
    z = zipfile.ZipFile(pptx)
    slides = sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)), key=lambda n: int(re.findall(r'\d+', n)[0]))
    assert len(slides) == len(hal), f'jumlah slide {len(slides)} != manifest {len(hal)}'
    putih = hex_tema(t)
    S = t['slide']
    batas = int(S['tipografi']['batas_bawah_pt'] * 100)
    terlarang = t['kosakata']['istilah']['terlarang']
    ringkas = {'slide': len(slides), 'huruf_terkecil_pt': 99, 'warna': set(), 'angka_diperiksa': 0}
    tema_xml = z.read('ppt/theme/theme1.xml').decode()
    fonts_tema = set(re.findall(r'<a:latin typeface="([^"]*)"', tema_xml))
    assert fonts_tema == {t['font']['keluarga']}, f'D-4 theme1.xml: font tema {fonts_tema}, harus hanya Roboto'
    angka = {}
    for m in man['angka']:
        angka.setdefault(no_spek(m['naskah']), set()).update(RE_ANGKA.findall(m['tampil']))
    nomor_xy = (E(S['margin_kiri_pt'] + S['lebar_isi_pt'] - S['komponen']['bingkai']['nomor_lebar_pt']), E(S['footer']['y_pt']))
    for n, (nama, h, sl) in enumerate(zip(slides, hal, Presentation(pptx).slides), start=1):
        x = z.read(nama).decode()
        potong = [html.unescape(s) for s in re.findall(r'<a:t>([^<]*)</a:t>', x)]
        teks = ''.join(potong)
        lok = f'slide {n} ({h["jenis"]}, {h["asal"]})'
        for c, kode in (('—', 'D-1 em dash'), ('·', 'D-2 titik tengah'), ('…', 'D-17 elipsis terpotong')):
            assert c not in teks, f'{kode} di {lok}'
        assert not re.search('[\U0001F300-\U0001FAFF☀-➿]', teks), f'D-3 emoji di {lok}'
        for ist in terlarang:
            assert not re.search(rf'(?<!\w){re.escape(ist)}(?!\w)', teks, re.I), f'D-10 istilah "{ist}" di {lok}'
        huruf = set(re.findall(r'typeface="([^"]*)"', x))
        assert huruf <= {t['font']['keluarga']}, f'D-4 {lok}: huruf {huruf - {t["font"]["keluarga"]}}'
        uk = [int(v) for v in re.findall(r'<a:rPr[^>]* sz="(\d+)"', x)]
        if uk:
            assert min(uk) >= batas, f'huruf {min(uk) / 100} pt < {batas / 100} pt di {lok} (Buku Pegangan: batas bawah 6 pt)'
            ringkas['huruf_terkecil_pt'] = min(ringkas['huruf_terkecil_pt'], min(uk) / 100)
        lain = RE_WARNA_LAIN.search(x)
        assert not lain, f'D-9 {lok}: warna {lain[0]} bukan srgbClr; semua warna slide wajib hex tema.json'
        tercatat = {hx for hx, _ in h['warna']}
        for hx in re.findall(r'srgbClr val="([0-9A-Fa-f]{6})"', x):
            assert hx.upper() in putih, f'D-9 {lok}: hex #{hx} di luar tema.json'
            assert hx.upper() in tercatat, f'D-24 {lok}: hex #{hx} tidak tercatat perannya di manifest generator'
            ringkas['warna'].add(hx.upper())
        kand = [s for s in sl.shapes if (s.left, s.top) == nomor_xy and getattr(s, 'has_text_frame', False)]
        if h['jenis'] in ('sampul', 'penutup'):
            assert S['footer']['teks'] not in teks and not kand, f'{lok}: footer di sampul atau penutup (Buku Pegangan)'
        else:
            assert S['footer']['teks'] in teks, f'{lok}: footer tidak ada'
            isi = [s.text_frame.text for s in kand]
            assert isi == [str(n)], f'{lok}: nomor halaman di pojok footer {isi}, harus ["{n}"]'
        if h['jenis'] not in ('sampul', 'penutup', 'pembatas-lampiran'):
            lebar = str(E(S['lebar_isi_pt']))
            for gy in S['garis']['y_pt']:
                assert re.search(rf'<a:off x="\d+" y="{E(gy)}"/><a:ext cx="{lebar}" cy="0"/>', x), f'{lok}: garis {gy} pt selebar {S["lebar_isi_pt"]} pt tidak ada'
        sah = angka.get(no_spek(h['asal']), set()) | {a for s in h['struktur'] for a in RE_ANGKA.findall(s)}
        for s in potong:  # D-22: tiap angka tampil berasal dari manifest angka (bersumber) atau teks struktur mesin
            for a in RE_ANGKA.findall(RE_BOLEH.sub('', s)):
                assert a in sah, f'D-22 {lok}: angka "{a}" di "{s[:50]}" tidak tercatat di manifest angka maupun struktur'
                ringkas['angka_diperiksa'] += 1
        d24(t, [tuple(w) for w in h['warna']], lok)
        if h.get('peta'):
            d8(t, h['peta'], lok)
    assert man['angka'] and all(m.get('sumber') for m in man['angka']), 'angka tanpa sumber di manifest'
    if pdf:
        ringkas.update(periksa_pdf(pdf, t, hal))
    ringkas['warna'] = len(ringkas['warna'])
    return ringkas


def baris_judul(page, x, y, w, h):
    """Jumlah baris teks yang mulai di tepi kiri kotak judul, dikelompokkan per garis dasar (D-17 diukur dari PDF)."""
    dasar = []
    for b in page.get_text('dict')['blocks']:
        for ln in b.get('lines', []):
            sp = [s for s in ln['spans'] if s['text'].strip()]
            if not sp:
                continue
            x0, y0, x1, y1 = ln['bbox']
            if x - 2 <= x0 <= x + 6 and x1 <= x + w + 4 and y - 2 <= (y0 + y1) / 2 <= y + h + 2:
                dasar.append((y1, max(s['size'] for s in sp)))
    dasar.sort()
    n, akhir = 0, None
    for y1, u in dasar:
        if akhir is None or y1 - akhir > u * 0.5:
            n += 1
        akhir = y1
    return n


def font_pdf(pdf):
    alat = shutil.which('pdffonts')
    assert alat, 'pdffonts (poppler) tidak ada; dibutuhkan untuk D-4'
    keluar = subprocess.run([alat, str(pdf)], capture_output=True, text=True, check=True).stdout.splitlines()
    i = next(k for k, b in enumerate(keluar) if b.startswith('---'))
    return [b.split()[0] for b in keluar[i + 1:] if b.strip()]


RUANG_MATI_MAKS = 25  # persen; kalibrasi pustaka ppt-konsultan: deck mutu 5 bermedian 7%, deck rujukan pemilik sampai 43%


def ruang_mati(page, radius=2):
    """Persen ruang mati di zona isi (x 4-96%, y 15-92%) dari render, sama persis dengan rupa.py skill ppt-konsultan:
    blok 1% x 1% yang hampir seragam (simpangan < 4) dan sewarna latar (selisih < 18), dan sekelilingnya (radius 2 blok)
    juga kosong. Celah antarbaris tidak dihitung; yang dihitung area tak terpakai, misalnya panel yang direntangkan
    setinggi slide padahal isinya pendek (vonis pemilik 26 Okt 2026: "white spacenya banyak ... banyakin aja datanya")."""
    import tempfile
    from PIL import Image, ImageStat
    # render poppler (pdftoppm), sama dengan PNG bukti README dan rupa.py; render PyMuPDF berbeda di slide berpil
    with tempfile.TemporaryDirectory() as tmp:
        n = page.number + 1
        subprocess.run(['pdftoppm', '-png', '-f', str(n), '-l', str(n), '-singlefile', '-scale-to', '1600', page.parent.name, f'{tmp}/h'], check=True)
        im = Image.open(f'{tmp}/h.png').convert('RGB')
    W, H = im.size
    latar = max([im.getpixel((int(W * 0.5), int(H * 0.985))), im.getpixel((int(W * 0.98), int(H * 0.5))), (255, 255, 255)], key=sum)
    x0, x1, y0, y1 = int(W * 0.04), int(W * 0.96), int(H * 0.15), int(H * 0.92)
    bw, bh = max(4, W // 100), max(4, H // 100)
    grid = []
    for y in range(y0, y1 - bh, bh):
        baris = []
        for x in range(x0, x1 - bw, bw):
            st = ImageStat.Stat(im.crop((x, y, x + bw, y + bh)))
            baris.append(max(st.stddev) < 4 and sum(abs(a - b) for a, b in zip(st.mean, latar)) < 18)
        grid.append(baris)
    R, C = len(grid), len(grid[0]) if grid else 0
    mati = sum(all(grid[rr][cc] for rr in range(max(0, r - radius), min(R, r + radius + 1)) for cc in range(max(0, c - radius), min(C, c + radius + 1)))
               for r in range(R) for c in range(C))
    return 100 * mati / max(1, R * C)


def periksa_pdf(pdf, t, hal):
    import pymupdf
    doc = pymupdf.open(str(pdf))
    assert len(doc) == len(hal), f'PDF {len(doc)} halaman, PPTX {len(hal)} slide (P13: jumlah halaman PDF = dokumen asal)'
    font = font_pdf(pdf)
    asing = [f for f in font if t['font']['keluarga'] not in f.split('+')[-1]]
    assert font and not asing, f'D-4 pdffonts: font {asing} di PDF; hanya Roboto (font tersubstitusi saat render)'
    judul, mati = [], []
    for n, (page, h) in enumerate(zip(doc, hal), start=1):
        lok = f'PDF hlm {n} ({h["jenis"]}, {h["asal"]})'
        teks = page.get_text()
        for c, kode in (('—', 'D-1 em dash'), ('·', 'D-2 titik tengah'), ('…', 'D-17 elipsis terpotong')):
            assert c not in teks, f'{kode} di {lok}'
        if h.get('judul'):
            x, y, w, hh, maks = h['judul']
            nb = baris_judul(page, x, y, w, hh)
            assert 1 <= nb <= maks, f'D-17 {lok}: judul {nb} baris di render PDF, batas {maks}'
            judul.append(nb)
        if h['jenis'] not in ('sampul', 'penutup', 'pembatas-lampiran'):  # hanya slide isi yang diukur
            rm = ruang_mati(page)
            assert rm <= RUANG_MATI_MAKS, f'D-39 {lok}: ruang mati {rm:.0f}% (batas {RUANG_MATI_MAKS}%); tambah data atau pita bawah, jangan regangkan panel'
            mati.append(round(rm))
    return {'pdf_halaman': len(doc), 'pdf_font': sorted({f.split('+')[-1] for f in font}), 'judul_baris_pdf': judul, 'ruang_mati_pct': mati}


# ---------------------------------------------------------------- laporan QA per deck (Buku Pegangan S39)
KELOMPOK_QA = (  # gerbang repo qa/periksa.py per kelompok laporan; kode di luar daftar ini tidak berlaku untuk deck
    ('Font', ('D-4', 'D-5', 'D-23')),
    ('Tata letak', ('T-2', 'D-17', 'T-6', 'T-7', 'D-14', 'D-9', 'D-16', 'D-22', 'D-6')),
    ('Anti-AI', ('D-1', 'D-2', 'D-3', 'D-10', 'T-4', 'T-8')),
)


def _qa_repo():
    """qa/periksa.py dimuat dengan nama lain supaya tidak bertabrakan dengan modul ini."""
    import importlib.util
    if 'qa_periksa' not in sys.modules:
        sp = importlib.util.spec_from_file_location('qa_periksa', SINI.parents[1] / 'qa' / 'periksa.py')
        m = importlib.util.module_from_spec(sp)
        sys.modules['qa_periksa'] = m
        sp.loader.exec_module(m)
    return sys.modules['qa_periksa']


def _baris_garis_besar(man):
    """S34, S35, S7 dibaca ulang dari manifest berkas jadi: pesan kunci, lalu pesan, jenis_slide, judul_bentuk tiap slide isi."""
    from deck import BINGKAI, JENIS_S35
    salah = [] if (man.get('pesan_kunci') or '').strip() else ['tanpa pesan_kunci']
    for h in man['slide']:
        if h['jenis'] in BINGKAI:
            continue
        if not (h.get('pesan') or '').strip() or h.get('jenis_slide') not in JENIS_S35 or h.get('judul_bentuk') not in ('temuan', 'deskriptif'):
            salah.append(f'slide {h["nomor"]}: pesan/jenis_slide/judul_bentuk tidak lengkap')
    return salah


def laporan(pptx, t, pdf, ke=None):
    """Tulis laporan QA deck (font, ikon, tata letak, anti-AI) ke keluaran/qa/deck-<stem>.md; vonis LOLOS atau GAGAL
    memakai kosakata qa/periksa.py (S39). Kembalikan (jalur, vonis). Tidak berhenti di gagal pertama: tiap baris dinilai."""
    from datetime import datetime
    from deck import BINGKAI
    pptx, pdf = Path(pptx).resolve(), Path(pdf).resolve()
    man = manifest(pptx)
    baris = []  # (kelompok, pemeriksaan, vonis, rincian)
    tambah = lambda kel, apa, gagal, rinci='': baris.append((kel, apa, 'GAGAL' if gagal else 'LOLOS', rinci))
    # gerbang mesin deck (berhenti di pelanggaran pertama, jadi satu baris)
    try:
        r = periksa(pptx, t, pdf)
        tambah('Tata letak', 'Gerbang mesin deck bangun/pptx/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8)', False,
               f'{r["slide"]} slide, huruf terkecil {r["huruf_terkecil_pt"]:g} pt, {r["angka_diperiksa"]} angka, judul PDF {r.get("judul_baris_pdf")} baris')
        tambah('Font', 'pdffonts PDF deck hanya Roboto', False, ', '.join(r.get('pdf_font', [])))
    except AssertionError as e:
        tambah('Tata letak', 'Gerbang mesin deck bangun/pptx/periksa.py', True, str(e))
    # gerbang repo
    q = _qa_repo()
    log = []
    hasil = {k: (s, tm) for k, s, tm in q.jalankan(q.Ctx(pptx=str(pptx), pptx_pdf=str(pdf), tema=t), semua=True, ketat=True,
                                                   tulis=log.append, berkas_saja=True)}
    for kel, kode in KELOMPOK_QA:
        for k in kode:
            s, tm = hasil.get(k, ('TAK', []))
            if s == 'TAK':
                continue
            judul = next((j for kk, j, _ in q.GERBANG if kk == k), k)
            rinci = '; '.join(f'{lok}: {pesan}' for _, lok, pesan in tm[:3]) + (f' (dan {len(tm) - 3} lagi)' if len(tm) > 3 else '')
            tambah(kel, f'qa/periksa.py {k} {judul}', s != 'LOLOS', rinci)
    # ikon dan gambar raster (S37), dari XML berkas jadi dicocokkan dengan catatan generator
    z = zipfile.ZipFile(pptx)
    nama = sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)), key=lambda n: int(re.findall(r'\d+', n)[0]))
    asing, beda, n_ikon = [], [], 0
    for nm, h in zip(nama, man['slide']):
        pic = len(re.findall(r'<p:pic>', z.read(nm).decode()))
        g = h.get('gambar', [])
        n_ikon += g.count('ikon')
        if pic != len(g):
            beda.append(f'slide {h["nomor"]}: {pic} gambar di XML, {len(g)} tercatat generator')
        asing += [f'slide {h["nomor"]}: gambar "{x}"' for x in g if x not in ('logo', 'foto', 'peta', 'ikon')]
    tambah('Ikon', 'Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37)', bool(asing or beda), '; '.join(asing + beda))
    tambah('Ikon', 'Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun)', False,
           f'{n_ikon} ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json')
    # tata letak dari garis besar (S6, S34-S36, S38)
    gb = _baris_garis_besar(man)
    tambah('Tata letak', 'Garis besar: pesan_kunci, lalu pesan, jenis_slide S35, judul_bentuk S7 tiap slide isi (S34)', bool(gb), '; '.join(gb))
    isi = [h for h in man['slide'] if h['jenis'] not in BINGKAI]
    tanpa = [f'slide {h["nomor"]}' for h in isi if h.get('jenis_slide') != 'navigasi' and not h.get('visual')]
    tambah('Tata letak', 'Tiap slide isi selain navigasi memuat grafik native, tabel native, atau peta (S36)', bool(tanpa), ', '.join(tanpa))
    urut, kembar = [], []
    for h in isi:
        if h.get('jenis_slide') == 'lampiran':
            continue
        if urut and urut[-1][0] == h.get('jenis_slide') and not (h.get('seri') and h.get('seri') == urut[-1][1]):
            kembar.append(f'slide {h["nomor"]} {h.get("jenis_slide")}')
        urut.append((h.get('jenis_slide'), h.get('seri')))
    tambah('Tata letak', 'Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35)', bool(kembar),
           ', '.join(kembar) or ' > '.join(j for j, _ in urut))
    bersih = lambda s: re.sub(r'\s+', ' ', re.sub(r'\{\{[^}]*\}\}|\d+([.,]\d+)*', '', s)).strip().lower()
    judul = [bersih(h.get('judul_spek') or '') for h in isi if h.get('jenis_slide') != 'lampiran']  # lampiran lanjutan berjudul sama
    dua = sorted({j for j in judul if j and judul.count(j) > 1})
    tambah('Tata letak', 'Judul slide isi tidak kembar setelah angka dibuang (S6)', bool(dua), '; '.join(dua))
    butir, lebih = t['font']['butir_1'], []
    for nm, h in zip(nama, man['slide']):
        for tx in re.findall(r'<p:txBody>(.*?)</p:txBody>', z.read(nm).decode(), re.S):
            n = sum(1 for p in re.findall(r'<a:p>(.*?)</a:p>', tx, re.S) if re.search(rf'<a:t>{re.escape(butir)}', p))
            if n > 6:
                lebih.append(f'slide {h["nomor"]}: {n} butir')
    tambah('Tata letak', 'Paling banyak 6 butir per kotak teks (S38)', bool(lebih), '; '.join(lebih))
    vonis = 'GAGAL' if any(b[2] == 'GAGAL' for b in baris) else 'LOLOS'
    n_g = sum(b[2] == 'GAGAL' for b in baris)
    sel = lambda s: str(s).replace('|', '/').replace('\n', ' ')
    md = [f'# Laporan QA deck {pptx.stem}', '',
          f'Berkas `{pptx.name}` dan `{pdf.name}`, spek `{man.get("spek")}`, diperiksa {datetime.now():%d-%m-%Y %H.%M} WIB.',
          f'Vonis: **{vonis}**' + (f' ({n_g} pemeriksaan gagal)' if n_g else '') + '. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py '
          '(Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.', '',
          f'Pesan kunci: {man.get("pesan_kunci") or "(tidak ada)"}', '',
          '| Kelompok | Pemeriksaan | Vonis | Rincian |', '| --- | --- | --- | --- |']
    for kel, _ in (('Font', 0), ('Ikon', 0), ('Tata letak', 0), ('Anti-AI', 0)):
        md += [f'| {kel} | {sel(a)} | {v} | {sel(r) or "–"} |' for k_, a, v, r in baris if k_ == kel]
    md += ['', '## Garis besar (S6, S34)', '', 'Judul dibaca berurutan sebagai ringkasan sebelum dikirim.', '',
           '| Slide | Jenis | Judul | Pesan |', '| --- | --- | --- | --- |']
    md += [f'| {h["nomor"]} | {h.get("jenis_slide") or h["jenis"]}{"; " + h["judul_bentuk"] if h.get("judul_bentuk") else ""} | '
           f'{sel(h.get("judul_spek") or "–")} | {sel(h.get("pesan") or "–")} |' for h in man['slide']]
    ke = Path(ke) if ke else SINI.parents[1] / 'keluaran' / 'qa'
    ke.mkdir(parents=True, exist_ok=True)
    jalur = ke / f'deck-{pptx.stem}.md'
    jalur.write_text('\n'.join(md) + '\n', encoding='utf-8')
    return jalur, vonis


def _uji_diri():
    import pymupdf
    from deck import Deck, DeckGalat, ke_pdf
    keluar = SINI / 'keluaran'
    hasil = {}
    for spek in sorted((SINI / 'contoh').glob('spek-*.json')):
        sp = json.loads(spek.read_text(encoding='utf-8'))
        d = Deck(sp, spek.stem, berkas_spek=spek)
        p = keluar / f'{spek.stem}.pptx'
        d.bangun(p)
        pdf = ke_pdf(p)
        hasil[spek.stem] = periksa(p, d.t, pdf)
        assert basi(manifest(p)) == [], 'keluaran segar terbaca basi'
        jalur, vonis = laporan(p, d.t, pdf, ke=keluar / 'qa')  # S39: contoh lolos semua baris laporan
        assert vonis == 'LOLOS', f'laporan QA deck {spek.stem} GAGAL: {jalur}'
        hasil[spek.stem]['laporan'] = vonis
    t = d.t
    # fixture spek rusak: tiap gerbang generator harus menolak
    dasar = json.loads((SINI / 'contoh/spek-mitigasi.json').read_text(encoding='utf-8'))
    air = json.loads((SINI / 'contoh/spek-uji-air.json').read_text(encoding='utf-8'))
    i_grafik = next(i for i, s in enumerate(dasar['slide']) if s['jenis'] == 'temuan-grafik')
    i_kartu = next(i for i, s in enumerate(dasar['slide']) if s['jenis'] == 'kartu-angka')
    i_peta = next(i for i, s in enumerate(dasar['slide']) if s['jenis'] == 'temuan-peta')
    i_fase = next(i for i, s in enumerate(air['slide']) if s['jenis'] == 'strategi-tiga-fase')
    i_rek2 = max(i for i, s in enumerate(air['slide']) if s['jenis'] == 'rekomendasi')
    i_tabel = next(i for i, s in enumerate(air['slide']) if s['jenis'] == 'tabel-peringkat')
    i_sken = next(i for i, s in enumerate(air['slide']) if s['jenis'] == 'skenario')
    pra = lambda x: x['slide'][i_fase]['fase']['prabencana'][0]
    pn = lambda x: x['slide'][i_peta]['peta']['penanda']
    fixture = [
        (dasar, lambda x: x['slide'][i_grafik].update(judul='IRB nasional — turun', judul_bentuk='deskriptif'), 'em dash'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul='IRB nasional turun 17,8 persen', judul_bentuk='deskriptif'), 'angka diketik'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul='Indeks risiko ' * 14, judul_bentuk='deskriptif'), 'judul lebih dari 2 baris'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul='Sebaran titik api {{angka:irbi.nasional.2024}}'), 'istilah terlarang'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul='IRB {{angka:tidak.ada}}'), 'tidak ada di data/angka.json'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul='IRB {{nilai:irbi.nasional.2024}}', judul_bentuk='deskriptif'), 'token tidak dikenal'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul='Korban {{angka:hidromet.jawa.lanina.pd.korban_jiwa|rentang}} jiwa'), 'berlabel ilustrasi'),
        (dasar, lambda x: x['slide'][i_kartu]['grup'][0]['kartu'][0].update(ikon='tidak-ada'), 'tidak ada di registri'),
        (dasar, lambda x: x['slide'][i_kartu]['grup'][0]['kartu'][0].update(warna='hijau'), 'token warna tidak dikenal'),
        (dasar, lambda x: x['slide'][i_kartu]['grup'][1]['kartu'][0].update(warna='merah'), 'berlabel kelas indeks'),
        (dasar, lambda x: x['slide'][i_kartu]['temuan'][0].update(kode='B.1'), 'harus berbentuk "Temuan B.1"'),
        (dasar, lambda x: x['slide'][i_kartu]['temuan'][0].pop('keyakinan'), 'tanpa keyakinan'),
        (dasar, lambda x: x['slide'][i_kartu].pop('tesis'), 'tanpa "tesis"'),
        (dasar, lambda x: x['slide'][i_grafik]['grafik']['data'].update(keyakinan='pasti'), 'bukan salah satu dari lima label'),
        (dasar, lambda x: pn(x)[1].update(x=pn(x)[0]['x'], y=pn(x)[0]['y']), 'tumpang'),
        (dasar, lambda x: pn(x)[1].update(x=0.43, y=0.45), 'daratan berdata'),
        (dasar, lambda x: x['slide'].append({'jenis': 'grafik-pai'}), 'tidak dikenal'),
        (dasar, lambda x: x['slide'].insert(1, {'jenis': 'pembatas-lampiran', 'kelompok': {}}) or x['slide'].__setitem__(slice(2, None), [s for s in x['slide'][2:] if s['jenis'] != 'lampiran-tabel']), 'tanpa slide lampiran'),
        (air, lambda x: pra(x).update(kode='99'), 'tidak ada di matriks rekomendasi'),
        (air, lambda x: pra(x).update(waktu='2028-2030'), 'beda dengan rekomendasi'),
        # garis besar (Buku Pegangan S34, S35, S7, S38)
        (dasar, lambda x: x.pop('pesan_kunci'), 'tanpa "pesan_kunci"'),
        (dasar, lambda x: x['slide'][i_grafik].pop('pesan'), 'tanpa "pesan"'),
        (dasar, lambda x: x['slide'][i_grafik].update(jenis_slide='diagram'), 'daftar tertutup S35'),
        (dasar, lambda x: x['slide'][i_peta].update(jenis_slide='grafik'), 'hanya sah untuk jenis_slide'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul_bentuk='aksi'), 'harus "temuan" atau "deskriptif"'),
        (dasar, lambda x: x['slide'][i_kartu].update(judul_bentuk='temuan'), 'berjudul deskriptif'),
        (dasar, lambda x: x['slide'][i_grafik].update(judul_bentuk='deskriptif', judul='A1. ' + x['slide'][i_grafik]['judul']), 'wajib temuan'),
        (air, lambda x: x['slide'][i_tabel].update(judul_bentuk='temuan'), 'tanpa token'),
        (air, lambda x: x['slide'][i_rek2].pop('seri'), 'sama dengan slide isi sebelumnya'),
        (air, lambda x: x['slide'][i_sken]['skenario'].update(respons=['Butir respons'] * 7), 'S38'),
    ]
    for asal, fn, harap in fixture:
        x = copy.deepcopy(asal)
        fn(x)
        try:
            Deck(x, 'fixture').bangun(keluar / 'fixture.pptx')
        except (DeckGalat, KeyError) as e:
            assert harap in str(e), f'fixture "{harap}" ditolak dengan pesan lain: {e}'
        else:
            raise AssertionError(f'fixture "{harap}" lolos, gerbang rusak')
    # fixture render D-39: slide lanjutan rekomendasi tanpa pita bawah menyisakan sepertiga slide kosong (35% saat diukur)
    x = copy.deepcopy(air)
    x['slide'][i_rek2].pop('pita', None)
    Deck(x, 'fixture-ruang').bangun(keluar / 'fixture-ruang.pptx')
    try:
        periksa(keluar / 'fixture-ruang.pptx', t, ke_pdf(keluar / 'fixture-ruang.pptx'))
    except AssertionError as e:
        assert 'D-39' in str(e), f'fixture ruang mati ditolak dengan pesan lain: {e}'
    else:
        raise AssertionError('fixture ruang mati lolos, gerbang D-39 rusak')
    # fixture XML dan manifest: periksa() harus menolak PPTX yang dirusak sesudah dibangun
    asli = keluar / 'spek-mitigasi.pptx'
    man0 = manifest(asli)
    nomor = lambda n, baru: lambda x: re.sub(
        rf'(<a:off x="{E(t["slide"]["margin_kiri_pt"] + t["slide"]["lebar_isi_pt"] - t["slide"]["komponen"]["bingkai"]["nomor_lebar_pt"])}" '
        rf'y="{E(t["slide"]["footer"]["y_pt"])}"/>.*?<a:t>){n}(</a:t>)', rf'\g<1>{baru}\g<2>', x, count=1, flags=re.S)

    def konflik(m):
        m['slide'][2]['warna'] += [['2F86D1', 'kategori.basah'], ['2F86D1', 'arah']]
    rusak = [
        (2, lambda x: x.replace('<a:t>Pesan kunci</a:t>', '<a:t>Pesan — kunci</a:t>', 1), None, 'D-1'),
        (2, lambda x: x.replace('typeface="Roboto"', 'typeface="Arial"', 1), None, 'D-4'),
        (2, lambda x: x.replace('srgbClr val="051C2C"', 'srgbClr val="D9650B"', 1), None, 'D-9'),
        (2, lambda x: re.sub(r'<a:srgbClr val="051C2C"/>', '<a:schemeClr val="accent2"/>', x, count=3), None, 'D-9'),
        (2, lambda x: re.sub(r'sz="\d+"', 'sz="500"', x, count=1), None, 'batas bawah 6 pt'),
        (2, nomor(2, 3), None, 'nomor halaman'),
        (8, nomor(8, 99), None, 'nomor halaman'),  # sel Maluku = 8 di tabel tidak boleh meloloskan nomor halaman yang salah
        (9, nomor(9, ''), None, 'nomor halaman'),
        (2, lambda x: x.replace('<a:t>Pesan kunci</a:t>', '<a:t>Pesan kunci 37</a:t>', 1), None, 'D-22'),
        (3, None, konflik, 'D-24'),
    ]
    for no, fn, fm, harap in rusak:
        p = keluar / 'fixture-xml.pptx'
        target = f'ppt/slides/slide{no}.xml'
        with zipfile.ZipFile(asli) as zi, zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as zo:
            for nm in zi.namelist():
                isi = zi.read(nm)
                if nm == target and fn:
                    baru = fn(isi.decode())
                    assert baru != isi.decode(), f'fixture XML "{harap}" tidak mengubah {target}'
                    isi = baru.encode()
                zo.writestr(nm, isi)
        m = copy.deepcopy(man0)
        if fm:
            fm(m)
        p.with_suffix('.manifest.json').write_text(json.dumps(m, ensure_ascii=False), encoding='utf-8')
        try:
            periksa(p, t)
        except AssertionError as e:
            assert harap in str(e), f'fixture XML "{harap}" ditolak dengan pesan lain: {e}'
        else:
            raise AssertionError(f'fixture XML "{harap}" lolos, gerbang periksa() rusak')
    # laporan QA deck: PPTX berem dash (fixture XML D-1) tercatat GAGAL di laporan, bukan dilewati
    p = keluar / 'fixture-xml.pptx'
    with zipfile.ZipFile(asli) as zi, zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as zo:
        for nm in zi.namelist():
            isi = zi.read(nm)
            zo.writestr(nm, isi.decode().replace('<a:t>Pesan kunci</a:t>', '<a:t>Pesan \u2014 kunci</a:t>', 1).encode()
                        if nm == 'ppt/slides/slide2.xml' else isi)
    p.with_suffix('.manifest.json').write_text(json.dumps(man0, ensure_ascii=False), encoding='utf-8')
    jalur, vonis = laporan(p, t, asli.with_suffix('.pdf'), ke=keluar / 'qa')
    isi_lap = jalur.read_text(encoding='utf-8')
    assert vonis == 'GAGAL' and re.search(r'\| Anti-AI \| qa/periksa.py D-1 [^|]*\| GAGAL \|', isi_lap), f'laporan tidak mencatat em dash: {jalur}'
    jalur.unlink()
    # fixture PDF: font asing (D-4) dan judul tiga baris (D-17) harus ditolak dari render
    jk = man0['slide'][1]['judul']
    rusak_pdf = [
        (lambda pg: pg.insert_text((60, 470), 'Teks Helvetica', fontname='helv', fontsize=8), 'D-4 pdffonts'),
        (lambda pg: pg.insert_text((jk[0], jk[1] + 16), 'Baris ketiga judul', fontname='Roboto',
                                   fontfile=str(berkas_font(t, 'bold')), fontsize=19), 'D-17'),
    ]
    for fn, harap in rusak_pdf:
        doc = pymupdf.open(str(asli.with_suffix('.pdf')))
        fn(doc[1])
        q = keluar / 'fixture.pdf'
        doc.save(str(q))
        try:
            periksa_pdf(q, t, man0['slide'])
        except AssertionError as e:
            assert harap in str(e), f'fixture PDF "{harap}" ditolak dengan pesan lain: {e}'
        else:
            raise AssertionError(f'fixture PDF "{harap}" lolos, gerbang PDF rusak')
    # fixture basi: berkas masukan berubah sesudah dibangun
    m = copy.deepcopy(man0)
    kunci = next(k for k in m['masukan'] if k.endswith('.csv'))
    m['masukan'][kunci] = '0' * 64
    assert kunci in basi(m), 'cek basi tidak menangkap masukan yang berubah'  # tema.json bisa ikut berubah: disunting sesi lain
    for nm in ('fixture.pptx', 'fixture.manifest.json', 'fixture-xml.pptx', 'fixture-xml.manifest.json', 'fixture.pdf'):
        (keluar / nm).unlink(missing_ok=True)
    return hasil, len(fixture) + len(rusak) + len(rusak_pdf) + 2


if __name__ == '__main__':
    if sys.argv[1:2] == ['--serah']:
        sys.path.insert(0, str(SINI.parent / 'kontrak'))
        from tema import muat
        p = Path(sys.argv[2]).resolve()
        lama = basi(manifest(p))
        assert not lama, f'keluaran basi, masukan berubah sesudah dibangun: {lama}; bangun ulang dengan deck.py --pdf'
        pdf = p.with_suffix('.pdf')
        assert pdf.exists() and pdf.stat().st_mtime >= p.stat().st_mtime, f'{pdf.name} tidak ada atau lebih tua dari PPTX'
        print('siap diserahkan:', json.dumps(periksa(p, muat(), pdf), ensure_ascii=False))
        jalur, vonis = laporan(p, muat(), pdf)
        print(f'laporan QA deck: {jalur} ({vonis})')
        sys.exit(0 if vonis == 'LOLOS' else f'laporan QA deck GAGAL: {jalur}')
    else:
        hasil, n = _uji_diri()
        print('periksa.py lolos:', json.dumps(hasil, ensure_ascii=False), f'{n} fixture rusak ditolak')
