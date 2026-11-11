"""Data tiga slide padat: dibaca slide3.py lewat padat.json."""
import json, csv
PJ = 'C:/Users/USER/.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir0811/data/lap/'
RP = 'D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/banjir-bang-ghozi-2026-11-08/'
c = lambda n: list(csv.DictReader(open(PJ + n, encoding='utf-8')))
P = json.load(open('data/banjir_data_prakiraan72.json', encoding='utf-8')); W = json.load(open('data/banjir_data_wilayah_hari.json', encoding='utf-8'))
NM = {p['kode']: p['nama'] for p in W['provinsi']}; S4 = json.load(open('kec4s.json', encoding='utf-8'))['rows']; J = json.load(open('jalur.json', encoding='utf-8'))
g = {}
for k, v in P['kec'].items():
    o = g.setdefault(k[:2], [0, 0, 0, 0]); mb, ml = max(v['b']), max(v['l'])
    if mb == 3: o[0] += 1
    if mb == 2: o[1] += 1
    if ml == 3: o[2] += 1
    if ml == 2: o[3] += 1
rows = sorted([[NM.get(k, k)] + v for k, v in g.items() if sum(v)], key=lambda r: -(r[1] * 3 + r[2] + r[3] * 3 + r[4]))
puncak = sorted(S4, key=lambda r: -r['mm'])[:3]
_gs=lambda r:'Kualanamu' if r['kp'] in ('11','12') else 'UPT Padang'
_jp=list(dict.fromkeys(r['prov'] for r in J['sum'])); _jq=lambda p:[r for r in J['sum'] if r['prov']==p]
jl=[dict(prov=p,asal=_gs(_jq(p)[0]),n=str(len(_jq(p))),darat=str(sum(r['moda']=='Darat' for r in _jq(p))),laut=str(sum(r['moda']=='Laut' for r in _jq(p))),jam=f"{min(r['jam'] for r in _jq(p))}-{max(r['jam'] for r in _jq(p))} jam") for p in _jp]
out = dict(cutoff=P['dibuat'][11:16].replace(':', '.'), lp=c('lp.csv'), prov=c('p4p.csv'), keb=c('lg4.csv'), lg=c('lg.csv'), jl=jl, bl=rows, puncak=[dict(kab=r['kab'], mm=round(r['mm']), tgl=r['tgl']) for r in puncak],
           n_kab=len(S4), n_prov=len({r['pr'] for r in S4}), a=sum(r['a'] for r in S4), s=sum(r['s'] for r in S4), la=sum(r[3] for r in rows), ls=sum(r[4] for r in rows), jam1=J['jam1'], n_jl=len(J['sum']))
json.dump(out, open(RP + 'padat.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print({k: v for k, v in out.items() if k in ('cutoff', 'a', 's', 'la', 'ls', 'n_kab', 'n_prov', 'jam1', 'n_jl', 'puncak')}); print(rows)
