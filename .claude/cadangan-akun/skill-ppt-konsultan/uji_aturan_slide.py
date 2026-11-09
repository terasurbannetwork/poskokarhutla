"""Uji aturan_slide.py: deck tanpa KRIS, bercatatan, dan bertanggal basi ditolak; deck yang benar lolos."""
import sys, tempfile
from datetime import date
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pptx import Presentation
from pptx.util import Inches as I
import aturan_slide as A

def buat(sumber, kris=True):
    p = Presentation(); s = p.slides.add_slide(p.slide_layouts[6])
    if kris: s.shapes.add_picture(str(A.LOGO), I(1), I(1), I(2))
    s.shapes.add_textbox(I(1), I(6), I(8), I(1)).text_frame.text = sumber
    f = Path(tempfile.mkdtemp()) / 'x.pptx'; p.save(f); return f

T = date(2026, 11, 8)
assert A.cek(buat('Sumber: GIS BNPB, 8 Nov 2026 22.45 WIB; Laporan Dit. Koordalops BNPB, 1 s.d. 8 Nov 2026'), T) == []
assert any('KRIS' in g for g in A.cek(buat('Sumber: GIS BNPB, 8 Nov 2026', kris=False), T))
assert A.cek(buat('Sumber: GIS BNPB, 8 Nov 2026', kris=False), T, 'alasan pemilik') == []
assert any('Perkiraan' in g for g in A.cek(buat('Sumber: Perkiraan dari jarak; belum dikonfirmasi operator angkutan')))
assert any('berhenti 07-11-2026' in g for g in A.cek(buat('Sumber: GIS BNPB, 8 Nov 2026; Laporan Dit. Koordalops BNPB, 5 s.d. 7 Nov 2026'), T))
assert A.cek(buat('Sumber: GIS BNPB, 7 Nov 2026'), T) == []   # rekap satelit H-1 pada laporan harian sah
assert A.cek(buat('Sumber: BPBD Sumbar, Okt 2026; Poslog Kualanamu, 25 Okt 2026'), T) == []   # stok gudang boleh lebih tua
from PIL import Image as Im
lg = Im.open(A.LOGO).convert('RGBA'); pad = Im.new('RGBA', (lg.width, lg.height * 2), (0, 0, 0, 0)); pad.paste(lg, (0, lg.height // 2)); b = Path(tempfile.mkdtemp()) / 'k.png'; pad.save(b)
pr = Presentation(); s_ = pr.slides.add_slide(pr.slide_layouts[6]); s_.shapes.add_picture(str(b), I(1), I(1), I(2)); f_ = Path(tempfile.mkdtemp()) / 'y.pptx'; pr.save(f_)
assert A.cek(f_) == [], 'logo KRIS berbantalan harus dikenali'
assert A.mirip_kris(A.LOGO.read_bytes(), A.jejak(A.LOGO.read_bytes()))
bn = Path(A.LOGO).parent / 'lembaga'
assert A.tanggal_nama('Situasi Banjir 081126 final 45.pptx') == T
print('uji aturan slide lolos')
