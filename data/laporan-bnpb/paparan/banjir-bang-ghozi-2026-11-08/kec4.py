import json,collections as C
R='D:/Project/Work/BNPB/poskokarhutla/'
L=lambda n: json.load(open('data/'+n,encoding='utf-8'))
P=L('banjir_data_prakiraan72.json'); W=L('banjir_data_wilayah_hari.json')
Pd=json.load(open(R+'public/data/penduduk.json',encoding='utf-8'))['kec']
NM={p['kode']:p['nama'] for p in W['provinsi']}
H=[8,9,10,11]
K=[]; lv=C.Counter()
for key,v in P['kec'].items():
    pr,kab,kec=key.split('|'); ps=[v['pb'][d][1] for d in range(4)]; mx=max(ps)
    k=pr+'|'+kab; lv[k]=max(lv[k],max(v['b']))
    K.append(dict(key=key,k=k,pr=pr,prov=NM.get(pr,pr),kab=kab,kec=kec,pop=Pd.get(key),p=mx,tgl=H[ps.index(mx)]))
for ambang in (20,30,40,50):
    xs=[r for r in K if r['p']>=ambang]; print(ambang,'kec',len(xs),'kab',len({r['k'] for r in xs}),'prov',len({r['pr'] for r in xs}))
ambang=20
xs=[r for r in K if r['p']>=ambang]; g={}
for r in xs:
    o=g.setdefault(r['k'],dict(k=r['k'],prov=r['prov'],pr=r['pr'],kab=r['kab'],n=0,pop=0,ada=False,p=0,tgl=None))
    o['n']+=1
    if r['pop'] is not None: o['pop']+=r['pop']; o['ada']=True
    if r['p']>o['p']: o['p']=r['p']; o['tgl']=r['tgl']
rows=sorted(g.values(),key=lambda o:(-o['p'],-o['n'],o['kab']))
for o in rows: print(o['p'],o['tgl'],o['prov'],'|',o['kab'],o['n'],o['pop'])
print(len(rows),min(o['p'] for o in rows),max(o['p'] for o in rows),len({o['pr'] for o in rows}),sum(o['n'] for o in rows),sum(o['pop'] for o in rows))
kl={k:v for k,v in lv.items()}
print('level kab maks',C.Counter(kl.values()),'kab dalam prakiraan',len(kl))
json.dump({'rows':rows,'lv':kl},open('kec4.json','w',encoding='utf-8'),ensure_ascii=False)
