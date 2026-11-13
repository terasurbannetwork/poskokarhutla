"""Kab/kota dengan kecamatan Awas atau Siaga dalam 4 hari, puncak hujan tiga hari dari kecamatan berstatus itu."""
import json
P = json.load(open('data/banjir_data_prakiraan72.json', encoding='utf-8')); S = json.load(open('data/banjir_data_status.json', encoding='utf-8')); W = json.load(open('data/banjir_data_wilayah_hari.json', encoding='utf-8'))
H = [f"{int(t[8:])} Nov" for t in P['hari']]; P = P['kec']; S = S['kec']
NM = {p['kode']: p['nama'] for p in W['provinsi']}; g = {}
for k, v in P.items():
    m = max(v['b'])
    if m < 2: continue
    q = k.rsplit('|', 1)[0]; o = g.setdefault(q, dict(k=q, pr=q[:2], prov=NM.get(q[:2], q[:2]), kab=q.split('|')[1], a=0, s=0, mm=0, tgl=''))
    o['a' if m == 3 else 's'] += 1; h = (S.get(k) or {}).get('h3d')
    if h and max(h) > o['mm']: o['mm'] = max(h); o['tgl'] = H[h.index(max(h))]
U0 = ['11', '13', '12']; ur = U0 + sorted({o['pr'] for o in g.values()} - set(U0))
rows = sorted(g.values(), key=lambda o: (ur.index(o['pr']), -o['a'], -(o['a'] + o['s']), -o['mm']))
json.dump({'rows': rows}, open('kec4s.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(rows), 'kab', len(ur), 'prov', ur, 'awas', sum(o['a'] for o in rows), 'siaga', sum(o['s'] for o in rows))
