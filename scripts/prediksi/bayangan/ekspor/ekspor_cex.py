# Ekspor tabel lab -> JSON ramping. Jalankan dengan LAB_ADU=<folder lab> <lab>/venv/bin/python -I <skrip>; hasil disalin ke ..
import sys, os, json, numpy as np
os.environ['JEDA']='7'
LAB=os.environ['LAB_ADU'].rstrip('/') + '/'
SK=LAB+'adu/cuaca_ekstrem/skrip'
sys.path.insert(0,SK); sys.argv=['x']
import adu as A
from data import muat, N, I_TR, idx
import fitur as FT
d=muat(); K=len(d['kodes']); kodes=d['kodes']
ko=json.load(open(LAB+'adu/cuaca_ekstrem/koefisien_kab.json'))
assert A.LRF==list(ko['koef'])
F=A.siapkan(d,I_TR,0,ko['klim_a'])
lv=np.linspace(0,1,41)
src={'m0':F['m0'],'s7':F['s7'],'s30':F['s30'],'mx3':F['mx3']}
it=d['it']
kab={}
for i,k in enumerate(kodes):
    R=d['R'][i,:I_TR+1]; M=d['M'][i,:I_TR+1]
    ok=R>1.0
    kab[k]={'q':{n:[round(float(v),1) for v in np.quantile(a[i,:I_TR+1],lv)] for n,a in src.items()},
            'klim':ko['klim_kab_bulan'][k],'a':ko['kab'][k]['a'],'bu':ko['kab'][k]['bu'],'bv':ko['kab'][k]['bv'],
            'it_2025':float(it[i,2025-2008]),
            'rasio_m':round(float(np.nansum(M[ok])/max(np.nansum(R[ok]),1e-6)),3)}
json.dump({'koef':ko['koef'],'b0':ko['b0'],'mu_u_v':ko['mu_u_v'],'sd_u_v':ko['sd_u_v'],'kab':kab,'periode_latih':'2008-01-01..2019-12-31','jeda':7,
           'hujan':'CHIRPS 0,05 rerata dan maks sel kab','klim_a':ko['klim_a']},open('cex_tabel.json','w'),separators=(',',':'))
# fixture
fx=[]
sig=lambda z:1/(1+np.exp(-z))
Y=d['Y']
for kd in ('1101','3171','7371'):
    i=kodes.index(kd)
    for tgl in ('2026-01-20','2026-03-10'):
        t=idx(tgl)
        x={n:float(F[n][i,t]) for n in A.LRF}
        u=(np.log1p(F['m0'][i,t])-ko['mu_u_v'][0])/ko['sd_u_v'][0]; v=(np.log1p(F['s7'][i,t])-ko['mu_u_v'][1])/ko['sd_u_v'][1]
        z=ko['b0']+sum(ko['koef'][n]*x[n] for n in A.LRF)+ko['kab'][kd]['a']+ko['kab'][kd]['bu']*u+ko['kab'][kd]['bv']*v
        lo=t-400
        ev=[[int(j),int(s)] for j in range(K) for s in np.nonzero(Y[j,max(lo,0):t+1])[0]+max(lo,0)] if False else None
        # kejadian semua kab 100 hari terakhir; 3 kab uji 400 hari
        evs=[]
        for j in range(K):
            a0=lo if j==i else t-100
            for s in np.nonzero(Y[j,a0:t+1])[0]+a0: evs.append([kodes[j],int(s)])
        fx.append({'kab':kd,'tgl':tgl,'t':int(t),'R':[round(float(q),3) for q in d['R'][i,t-119:t+1]],'M':[round(float(q),3) for q in d['M'][i,t-119:t+1]],
                   'z':float(z),'p':float(sig(z)),'x':x,'ev':evs})
json.dump(fx,open('cex_fixture.json','w'),separators=(',',':'))
print('ok',[ (f['kab'],f['tgl'],round(f['p'],5)) for f in fx])
