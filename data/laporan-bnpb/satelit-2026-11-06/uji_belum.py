"""Uji: belum padam hitungan sendiri (satelit.hitung = rumus peta_karhutla) terhadap belum_kini website 5 Nov 23.45, dan hitungan
6 Nov s.d. 18.00 untuk mengganti belum_kini yang belum terbit (pemilik 6 Nov: jangan sandingkan data beda hari)."""
import datetime as dt, json, os
S = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(S, 'jalan.py'), encoding='utf-8').read()
src = src[:src.index('penanganan.wa_operasi.operasi = lambda')]
g = {'__file__': os.path.join(S, 'jalan.py'), '__name__': 'uji'}
exec(compile(src, 'jalan.py', 'exec'), g)
asli, KINI, P, D = g['asli'], g['KINI'], g['P'], g['D']
k5 = dt.date(2026, 11, 5)
a = asli(k5, '23:45', 2); i = a['hari'].index(k5.isoformat())
sb = {k: round(o['belum'][i]) for k, o in a['prov'].items()}
print('5 Nov 23.45 belum sendiri', sum(sb.values()), 'vs belum_kini web', round(sum(KINI['prov'].values())))
print('  beda > 5 ha:', {k: (sb.get(k, 0), round(v)) for k, v in KINI['prov'].items() if abs(sb.get(k, 0) - v) > 5})
j = P['hari'].index(k5.isoformat())
sl = {k: round(o['luas'][i]) for k, o in a['prov'].items()}
print('5 Nov luas sendiri', sum(sl.values()), 'vs peta_karhutla', round(sum((v['luas'][j] or 0) for v in P['prov'].values())))
b = asli(D, '18:00', 2); i = b['hari'].index(D.isoformat())
print('6 Nov s.d. 18.00 sendiri: luas', round(sum(o['luas'][i] for o in b['prov'].values())), 'belum', round(sum(o['belum'][i] for o in b['prov'].values())),
      'padam', round(sum(o['padam'][i] for o in b['prov'].values())), '| luas rumus jalan.py', sum(g['LUAS_D'].values()))
for k in ('62', '64', '74', '72', '16', '73'):
    o = b['prov'].get(k); print(' ', k, 'hot', o['hot'][i], 'luas', round(o['luas'][i]), 'belum', round(o['belum'][i]), 'padam', round(o['padam'][i]))
