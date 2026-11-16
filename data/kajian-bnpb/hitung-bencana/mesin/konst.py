"""Konstanta bersama mesin dokumen kajian: warna, jalur aset, judul, tanggal."""
import os
import datetime
from pathlib import Path

MESIN = Path(__file__).resolve().parent
KAJIAN = MESIN.parent
NASKAH = KAJIAN / 'naskah'
KELUARAN = KAJIAN / 'keluaran'
KERJA = MESIN / '_kerja'          # berkas antara (html, pdf bagian, toc.json); tidak di-commit
GBR = MESIN / 'gbr'               # PNG hasil gambar.mjs
REPO = KAJIAN.parents[2]

HOME = os.path.expanduser('~').replace('\\', '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
LOGO_BNPB = SK + 'proyek-bnpb/logo/sumber-bnpb.png'
LOGO_KRIS = (REPO / 'data/laporan-bnpb/generator/sampul/media/kris-logo.png').as_posix()
FONT = {'R': SK + 'fonts/Roboto-Regular.ttf', 'M': SK + 'fonts/Roboto-Medium.ttf', 'B': SK + 'fonts/Roboto-Bold.ttf'}

# foto sampul: banjir merendam permukiman, laporan situasi harian BNPB 17 Okt 2026 (1600x1200)
FOTO_SAMPUL = SK + 'proyek-bulanan/foto/web/h-1417.jpg'
FOTO_KREDIT = 'Foto: BNPB, banjir merendam permukiman, Oktober 2026 (laporan situasi harian BNPB, dikutip dari pemberitaan)'

JUDUL = 'Kajian Penghitungan dan Klasifikasi Kejadian Bencana'
ANAK = 'Satu kejadian, ambang masuk, dan skala keparahan untuk Satu Data Bencana'
LABEL = 'KAJIAN BNPB'
TATA = {}   # dari urutan JSON kunci "tata": toc_tingkat, bab_baru, tinggi_gambar_cm
KEPADA = '[diisi kemudian]'
OLEH = 'Tim Ahli dan Tim Sus IT BNPB'

NAVY, ORANYE, BIRU, MERAH = '051C2C', 'D9600B', '2F86D1', 'C8102E'
TEKS, TEKS2, TEKS3, GARIS, TINT = '1A1A1A', '2E3440', '6B7280', 'BFC5CC', 'F1F3F6'
TINTAPI, TINTAIR = 'FBE7D6', 'DCEBF8'
LEBAR = 17.6  # cm isi (A4 21 cm, margin 1,7 cm)

BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']


def tanggal_id(d=None):
    d = d or datetime.date.today()
    return f'{d.day} {BULAN[d.month - 1]} {d.year}'


def kode_tanggal(d=None):
    d = d or datetime.date.today()
    return d.strftime('%d%m%y')
