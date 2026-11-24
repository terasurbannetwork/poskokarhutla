"""Bangun Kajian Penghitungan dan Klasifikasi Kejadian Bencana: DOCX dan PDF dari naskah Markdown.

  py mesin/bangun.py                 # ujung ke ujung: gambar -> HTML -> PDF -> DOCX
  py mesin/bangun.py --tanpa-gambar  # lewati render gambar (pakai mesin/gbr yang ada)
  py mesin/bangun.py --hanya 04-bedah-kriteria.md lampiran-e-wawancara.md   # uji sebagian (keluaran bernama (uji))
  py mesin/bangun.py --word          # setelah DOCX jadi, perbarui daftar isi lewat Word (COM) bila terpasang
"""
import argparse
import os
import json
import re
import subprocess
import sys
import datetime
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import konst as K
import naskah as N
import html_tulis as H
import word_tulis as W
import catatan as C


def jalankan(cmd, **kw):
    r = subprocess.run(cmd, cwd=K.MESIN, env=os.environ.copy(), capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)
    if r.returncode:
        print(r.stdout[-2000:], r.stderr[-2000:])
        raise SystemExit(f'gagal: {" ".join(map(str, cmd))}')
    return r.stdout.strip()


def halaman_penanda(pdf, entri):
    import pymupdf
    d = pymupdf.open(pdf)
    peta = {}
    kode = {k for k, _, _ in entri}
    for i, pg in enumerate(d, start=1):
        for m in re.findall(r'ZQ\d{4}', pg.get_text()):
            if m in kode and m not in peta:
                peta[m] = i
    return peta, d.page_count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tanpa-gambar', action='store_true')
    ap.add_argument('--hanya', nargs='*')
    ap.add_argument('--word', action='store_true')
    ap.add_argument('--urutan', default='urutan.json', help='berkas urutan (relatif ke mesin/); boleh memuat folder, judul, anak_judul, label, nama_keluaran')
    a = ap.parse_args()

    K.KERJA.mkdir(exist_ok=True)
    K.KELUARAN.mkdir(exist_ok=True)
    cfg = json.loads((K.MESIN / a.urutan).read_text(encoding='utf-8'))
    if cfg.get('folder'):
        K.NASKAH = (K.MESIN / cfg['folder']).resolve()
    K.JUDUL = cfg.get('judul', K.JUDUL)
    K.ANAK = cfg.get('anak_judul', K.ANAK)
    K.LABEL = cfg.get('label', K.LABEL)
    K.TATA = cfg.get('tata', {})
    # sampul opsional per dokumen (jalur relatif ke mesin/)
    if cfg.get('foto'):
        K.FOTO_SAMPUL = (K.MESIN / cfg['foto']).resolve().as_posix()
    K.FOTO_KREDIT = cfg.get('foto_kredit', K.FOTO_KREDIT)
    K.OLEH = cfg.get('oleh', K.OLEH)
    K.OLEH_LABEL = cfg.get('oleh_label', K.OLEH_LABEL)
    if cfg.get('gbr'):          # folder PNG gambar milik kajian lain (relatif ke mesin/)
        K.GBR = (K.MESIN / cfg['gbr']).resolve()
    if cfg.get('keluaran'):     # folder keluaran milik kajian lain (relatif ke mesin/)
        K.KELUARAN = (K.MESIN / cfg['keluaran']).resolve()
        K.KELUARAN.mkdir(parents=True, exist_ok=True)
    nama_keluaran = cfg.get('nama_keluaran', 'Kajian Penghitungan dan Klasifikasi Kejadian Bencana')
    os.environ['JUDUL_KEPALA'] = K.JUDUL
    urut = cfg['berkas']
    if a.hanya:
        urut = [u for u in urut if u in a.hanya] + [u for u in a.hanya if u not in urut]
    dokumen = []
    for nama in urut:
        p = K.NASKAH / nama
        if not p.exists():
            print(f'PERINGATAN: {nama} belum ada, dilewati')
            continue
        blok, galat = N.baca(p)
        for g in galat:
            print(f'PERINGATAN {nama}: {g}')
        dokumen.append((nama, C.proses(nama, blok)))
    if not dokumen:
        raise SystemExit('tidak ada naskah')

    if not a.tanpa_gambar:
        print(jalankan(['node', 'gambar.mjs']))
    tgl = datetime.date.today()
    tanggal = K.tanggal_id(tgl)
    sufiks = ' (uji)' if a.hanya else ''
    dasar = f'{nama_keluaran} {K.kode_tanggal(tgl)}{sufiks}'
    hal = {}
    for lintasan in range(3):
        sampul, isi, entri = H.bangun(dokumen, hal, tanggal)
        (K.KERJA / 'sampul.html').write_text(sampul, encoding='utf-8')
        (K.KERJA / 'isi.html').write_text(isi, encoding='utf-8')
        print(jalankan(['node', 'cetak.mjs']))
        baru, n_hal = halaman_penanda(K.KERJA / '_isi.pdf', entri)
        if baru == hal:
            break
        hal = baru
    # cetakan akhir tanpa teks penanda ZQ (tak terlihat, tetapi ikut tersalin dan tercari di PDF);
    # span kosong dipertahankan supaya tata letak sama, lalu jumlah halaman diperiksa tetap
    bersih = re.sub(r'(<span class="mk">)ZQ\d{4}(</span>)', r'\1\2', isi)
    (K.KERJA / 'isi.html').write_text(bersih, encoding='utf-8')
    print(jalankan(['node', 'cetak.mjs']))
    import pymupdf
    if pymupdf.open(K.KERJA / '_isi.pdf').page_count != n_hal:
        raise SystemExit('cetakan tanpa penanda berbeda jumlah halaman; periksa tata letak')
    out = pymupdf.open()
    out.insert_pdf(pymupdf.open(K.KERJA / '_sampul.pdf'))
    out.insert_pdf(pymupdf.open(K.KERJA / '_isi.pdf'))
    # tautan internal (daftar isi, penanda catatan): insert_pdf tidak membawa tujuan bernama Chromium,
    # jadi dipasang ulang sebagai tautan halaman biasa (tujuan sudah diselesaikan PyMuPDF di _isi.pdf)
    sam = pymupdf.open(K.KERJA / '_sampul.pdf').page_count
    isi_pdf = pymupdf.open(K.KERJA / '_isi.pdf')
    tautan = 0
    for i, pg in enumerate(isi_pdf):
        for ln in pg.get_links():
            if ln.get('kind') in (pymupdf.LINK_NAMED, pymupdf.LINK_GOTO) and ln.get('page', -1) >= 0:
                y = ln['to'].y if ln.get('to') else 0
                out[sam + i].insert_link({'kind': pymupdf.LINK_GOTO, 'from': ln['from'], 'page': sam + ln['page'],
                                          'to': pymupdf.Point(0, max(y, 0)), 'zoom': 0})
                tautan += 1
    print('tautan internal PDF:', tautan)
    out.set_metadata({'title': K.JUDUL, 'author': K.OLEH, 'subject': K.ANAK})
    pdf = K.KELUARAN / (dasar + '.pdf')
    out.save(pdf, garbage=3, deflate=True)
    (K.KERJA / 'toc.json').write_text(json.dumps({k: v for k, v in hal.items()}, ensure_ascii=False), encoding='utf-8')
    print('PDF', pdf.name, out.page_count, 'halaman')

    docx = K.KELUARAN / (dasar + '.docx')
    W.bangun(dokumen, entri, hal, tanggal, docx)
    print('DOCX', docx.name)
    if a.word:
        ps = K.MESIN / 'perbarui_word.ps1'
        r = subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(ps), str(docx)], capture_output=True, text=True, timeout=300)
        print(r.stdout.strip(), r.stderr.strip()[:500])


if __name__ == '__main__':
    main()
