"""python3 penanganan_web.py <bmkg_wa.txt> <folder_keluar>  (KLUSTER_DIR = folder k23.json..k26.json dari
https://centurisk97.id/data/kluster_hari/YYYY-MM-DD.json; tanggal dan jam di baris terakhir)
Jalankan generator Penanganan 26 Okt tanpa tarik data baru: satelit dari cache (tarikan 14.15 WIB),
firespot dari arsip cluster web (kluster_hari indeks 4)."""
import datetime as dt, json, sys, os
G = os.path.expanduser('~/Documents/GitHub/poskokarhutla/data/laporan-bnpb/generator')
sys.path.insert(0, G); sys.path.insert(0, os.path.join(G, 'penanganan')); os.chdir(G)
import firespot_hari, penanganan
W = os.environ.get('KLUSTER_DIR', os.path.dirname(os.path.abspath(__file__)))  # folder berisi k<DD>.json unduhan kluster_hari web
def seri(hari_akhir, n, jam='17:00', kunci=None):
    hari = [hari_akhir - dt.timedelta(days=n - 1 - i) for i in range(n)]
    kol = [json.load(open(os.path.join(W, f'k{d.day}.json')))['w'] for d in hari]
    kode = sorted({k for c in kol for k in c if '|' not in k})
    return {k: [c.get(k, [0] * 7)[4] for c in kol] for k in kode}, [d.isoformat() for d in hari]
firespot_hari.seri = seri
penanganan.firespot_hari.seri = seri
import satelit
asli = satelit.hitung
def hitung(*a, **k):
    r = asli(*a, **k); return r
penanganan.bangun(dt.date(2026, 10, 26), '14:00', sys.argv[1], sys.argv[2])
