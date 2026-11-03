#!/usr/bin/env python3
"""Deck ringkasan dari deck utama flagship (pemilik 2 Nov 2026: "buat file baru, yaitu deck summarynya").

Membaca spek/flagship-031126.json (hasil bangun_spek_flagship.py), memilih slide inti, dan menulis
spek/ringkasan-flagship-031126.json. Angka tetap dari registri yang sama.
"""
import copy
import json
from pathlib import Path

SP = Path(__file__).resolve().parent
utama = json.loads((SP / 'flagship-031126.json').read_text(encoding='utf-8'))
S = utama['slide']


def cari(pesan):
    hasil = [s for s in S if s.get('pesan', '').startswith(pesan)]
    assert len(hasil) == 1, (pesan, len(hasil))
    return copy.deepcopy(hasil[0])


sampul = copy.deepcopy(next(s for s in S if s['jenis'] == 'sampul'))
sampul['judul_sampul'] = 'Ringkasan Program Flagship Kampus dan Dunia Usaha'
sampul['subjudul'] = 'Halaman inti dari deck lengkap untuk dibaca cepat sebelum rapat pimpinan'
penutup = copy.deepcopy(next(s for s in S if s['jenis'] == 'penutup'))
penutup['laporan'] = 'Ringkasan Program Flagship Kerja Sama BNPB dengan Perguruan Tinggi dan Dunia Usaha'

ringkas = cari('Ringkasan usulan flagship')
celah = cari('Paparan sebelumnya belum punya proyek bernama')
peta = cari('Flagship tersebar di semua regional')
jembatan = cari('Flagship dipilih dari ide lolos')
pagar = cari('Semua calon mitra di slide berikut')
pagar['judul'] = pagar['judul'].replace('Semua calon mitra di slide berikut', 'Semua calon mitra')
pagar['pesan'] = 'Semua calon mitra wajib lolos uji tuntas dulu'
tahap = cari('Flagship berjalan tiga tahap')
telu = cari('Status Telkom University')
daftar = cari('Daftar flagship yang dimintakan persetujuan')
putus = cari('Keputusan Kepala BNPB untuk memulai flagship')

# rujukan "slide N" di butir keputusan disesuaikan ke urutan deck ringkasan
NOMOR = {'slide 31': 'slide 12', 'slide 30': 'slide 11', 'slide 28': 'slide 10', 'slide 13': 'slide 9', 'slide 12': 'slide 7', 'slide 11': 'slide 6',
         'slide 7': '{{angka:pmk114.batas}}'}
for r in putus['rekomendasi']:
    r['dasar'] = NOMOR.get(r['dasar'], r['dasar'])

slide = [sampul, {'jenis': 'daftar-isi'}, ringkas, {'jenis': 'pembatas-seksi', 'bagian': 1}, celah, peta, jembatan,
         {'jenis': 'pembatas-seksi', 'bagian': 2}, pagar, tahap, telu, daftar, putus, penutup]
spek = {k: v for k, v in utama.items() if k not in ('slide', 'bagian')}
spek['bagian'] = [{'judul': 'Usulan dan Sebaran Flagship', 'label': 'Usulan'}, {'judul': 'Syarat Mitra dan Keputusan', 'label': 'Keputusan'}]
spek.update({
    '_catatan': 'Deck ringkasan dari flagship-031126.json, dibangun spek/bangun_spek_ringkasan.py (pemilik 2 Nov 2026).',
    'judul_dokumen': 'Ringkasan Program Flagship Kerja Sama BNPB dengan Perguruan Tinggi dan Dunia Usaha',
    'slide': slide,
})
(SP / 'ringkasan-flagship-031126.json').write_text(json.dumps(spek, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(slide), 'slide ringkasan')
