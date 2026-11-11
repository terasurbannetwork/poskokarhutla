import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Persediaan logistik dan peralatan per provinsi: gambar Gudang UPT Padang (Sumbar) + Rekap BANSOR_PDW_I.xlsx. Diringkas ke kolom utama."""
import json, re, csv
PJ = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir0811/'
R = {
'Sumatera Barat': [('Tenda Keluarga',315),('Tenda Pengungsi',1),('Paket Sembako',5),('Chainsaw',6),('Matras',5847),('Selimut',28),('Velbed',876),('Pompa Alkon 23 HP',22),('Geobag',820),('Kasur Busa Besar',2142),('Kasur Busa Kecil',3328),('Kasur Lipat',1856),('Terpal',180),('Perahu Fiber',2),('Perahu Karet + Deck',3),('Perahu Karet LCR 380',3),('Perahu Karet LCR 430',8),('Perahu Katamaran',10),('Pompa Alkon 6 HP',20),('Genset',6),('Pompa dan Selang',9),('Mobil Water Treatment Portable',1),('Water Treatment Portable',8),('Toren Air',3),('Obat-obatan',800)],
'Jawa Tengah': [('Pompa Air MP 10',1),('Genset 2kva',41),('Velbed',110),('Tenda Pengungsi 6x12m',13),('Tenda Keluarga 4,5x4,5 m',28),('Perahu Katamaran 3,2 M',6),('Pompa Apung 13 HP',10),('Pompa Air MP 10',1),('Pompa Air MP 10',1),('Selimut BNPB',10000),('Pompa Alkon 6 HP',5),('Pompa Jinjing 2 HP',5),('Pompa Air Punggung 19 Liter',10),('Pompa Tekanan Tinggi 8HP',2),('Pompa Dorong',5),('Pompa Air SANFIRE',1),('Geobag',600),('Tenda Gulung/Teal',600),('Selimut',550),('Matras',550),('Kasur lipat',200),('Perahu Karet LCR 380',2),('Perahu Karet LCR 430',1),('Tenda keluarga 4x4',100),('Tenda Pengungsi',4),('Tenda Keluarga DOME',50),('Velbed',100),('Pompa Alkon 6 HP',5),('Chainsaw',10),('Tenda pengungsi',1),('Selimut',100),('Matras',100),('Tenda Keluarga 4x4',42),('Pompa 6HP',2),('Kasur lipat',100),('Matras',200),('Selimut',200),('Tenda Pengungsi',1),('Terpal',100)],
'DI Yogyakarta': [('Matras',1800),('Genset 2Kva',32),('Perahu Karet dan Mesin',1),('Tenda Pengungsi',13),('Tenda Keluarga',171),('Velbed',180),('Terpal',300),('Kasur Lipat',100),('Pompa Alkon',5),('Chainsaw',10),('Geobag',100),('Selimut',1900),('Perahu Katamaran 3,2 m',4)],
'Sumatera Utara (Poslog Kualanamu)': [('Perahu Karet + Deck',11),('Genset 1500 Watt',5),('Pompa 23hp',2),('Geobag',1400),('Tenda Keluarga',144),('Tenda Pengungsi',8),('Kasur 90x190',1428),('Kasur 120x200',1617),('Kasur Lipat',2216),('Matras BNPB',1276),('Selimut',307),('Obat-obatan',93)],
'Kalimantan Tengah': [('Tenda Pleton',8),('Terpal',75),('Genset Kipor',1),('Genset 10 KVA',1),('Tenda Keluarga',19),('Tenda Pengungsi',4),('Velbed',70),('Perahu Dolphin',3),('Mobil Tangki Air',10)],
'Kalimantan Utara': [('Perahu Karet LCR',1),('Tenda Pengungsi 6x12m',2),('Genset',2),('Matras',500),('Selimut',500),('Pompa Alkon 18 HP',5),('Perahu PE',2)],
'Bali': [('Pompa Alkon 6 HP',133),('Tenda Keluarga 4x4 m',90),('Pompa Air MP 10',1),('Perahu Polyethylene',2),('Matras',300),('Selimut',300),('Tenda Pengungsi',2),('Kasur Lipat',100)],
'Sulawesi Tenggara': [('Pompa Jinjing Predator 3,5 HP',2),('Tenda Keluarga 4x4 m',2)],
'Maluku Utara': [('Tenda Pengungsi 6x12m',19),('Pompa Alkon',19),('Tenda Keluarga 4x4m',55),('Genset',3),('Gergaji Mesin',6),('Velbed',50),('Selimut',700),('Matras',1000),('Tenda Gulung/Teal',500),('Terpal',500)],
'Papua': [('Perahu Polythylene (PE) dan mesin 25 HP',6),('Tenda Pengungsi 6x12m',8),('Genset',4),('Kasur Lipat',400),('Selimut',400),('Matras',400)],
}
KAT = [('air', r'^(mobil water|water treatment|toren|mobil tangki)'), ('obat', r'^obat'), ('terpal', r'^(tenda gulung|terpal)'), ('perahu', r'^perahu'), ('pompa', r'^pompa'), ('genset', r'^genset'), ('chainsaw', r'^(chainsaw|gergaji mesin)'), ('geobag', r'^geobag'),
       ('tenda', r'^tenda'), ('velbed', r'^velbed'), ('matras', r'^(matras|kasur)'), ('selimut', r'^selimut')]
KOL = ['alat', 'perahu', 'genset', 'air', 'pompa', 'chainsaw', 'geobag', 'tenda', 'velbed', 'matras', 'selimut', 'terpal', 'obat']
rows = []
for prov, xs in R.items():
    t = dict.fromkeys(KOL, 0)
    for n, v in xs:
        k = next((k for k, p in KAT if re.match(p, n.lower())), None)
        if k in t: t[k] += v
    rows.append([prov] + [t[k] or '' for k in KOL]); print(prov, t)
BELUM = [('Aceh', 'Stok lama cukup; perlu tambahan permakanan, selimut'), ('Riau', 'Perahu, tenda, kendaraan operasional tersedia; logistik minim'),
         ('Jawa Timur', 'Apel siaga di 12 kab/kota; siaga darurat 38 kab/kota s.d. 30 Nov'), ('Bengkulu', 'Apel siaga Agustus; belum ada status darurat'),
         ('Papua Barat Daya', 'Belum ada status darurat'), ('Sulawesi Barat', 'Belum ada status darurat'),
         ('Belum melapor', 'Kepri, Sulteng, Papua Selatan, Kalbar, Kalsel, Sulsel, Maluku, NTT, Papua Pegunungan')]
def tulis(n, kol, rs):
    with open(PJ + 'data/lap/' + n, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(kol); w.writerows(rs)
tulis('lg.csv', ['prov'] + KOL, rows); tulis('lg2.csv', ['prov', 'ket'], BELUM)
EKSTRA = {'Sumatera Barat': [720,58,787,1368,1684,220,160,40,38,24,2,182,57,210,5,215,2410,380,1506,2118,100,1141,248,1184,10000,706,16,18,1,13],
 'Jawa Tengah': [100,100,100,3,1,1,3,1,100,120], 'DI Yogyakarta': [2], 'Sumatera Utara (Poslog Kualanamu)': [], 'Kalimantan Tengah': [120,200,72,21,232,36,1,3,10,200,3,3], 'Kalimantan Utara': [5,3], 'Bali': [130,30,2,50], 'Sulawesi Tenggara': [7,2], 'Maluku Utara': [1,7,300,5], 'Papua': [2]}
tot = {p: sum(v for _, v in xs) + sum(EKSTRA[p]) for p, xs in R.items()}
SB = 'Sumatera Barat'; pct = round(tot[SB] / sum(tot.values()) * 100); pct2 = round((tot[SB] - 10000) / (sum(tot.values()) - 10000) * 100); print('porsi Sumatera', tot, pct, 'tanpa masker', pct2)
json.dump({'n': len(rows), 'nb': len(BELUM) - 1 + 9, 'pct': pct, 'rinci': R}, open('logpal.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
