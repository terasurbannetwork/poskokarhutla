"""Alternatif laporan harian 311026 (pemilik 31 Okt): slide 3 dan 4 disatukan, tanpa pemisahan kejadian baru dan pengkinian.
Memakai kerja-311026/data.json, peta, dan ikon hasil jalan.py (jalankan jalan.py dulu)."""
import datetime as dt, json, os, sys
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
import harian, wa_harian
T = dt.date(2026, 10, 31); ke = os.path.join(S, 'kerja-311026')
D = json.load(open(os.path.join(ke, 'data.json'), encoding='utf-8'))
wa = wa_harian.koordalops(open(f'{S}/wa-koordalops.txt').read()); w = wa_harian.bmkg(open(f'{S}/wa-bmkg.txt').read())
wa['laporan'] += len(D.get('prioritas_baru', []))   # sama dengan jalan.py
tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
nama = os.path.join(S, 'Laporan Kejadian Bencana Harian 311026 (alternatif satu slide rincian).pptx')
dk = harian.Deck(ke, D, wa, w, T, None); dk.BJ = None
dk.LAMPIRAN = True; dk.GABUNG = True
dk.GA = wa_harian.pvmbg(open(f'{S}/wa-pvmbg.txt', encoding='utf-8').read())
dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = 'FIRESPOT DAN SISA 30 OKT', 'firespot', 'TERBAKAR 1 JAN–30 OKT'; dk.bangun(tpl, nama)
print('ok', nama)
import pdf; print('pdf', pdf.ke_pdf(nama))
