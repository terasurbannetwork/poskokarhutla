# Ekspor tabel lab -> JSON ramping. Jalankan dengan LAB_ADU=<folder lab> <lab>/venv/bin/python -I <skrip>; hasil disalin ke ..
import os
"""Ekspor tabel longsor dari lab ke JSON ramping (dijalankan lab/venv/bin/python -I)."""
import sys, json, numpy as np
LAB=os.environ['LAB_ADU'].rstrip('/') + '/'
SRC=LAB+'adu/longsor/skrip/adu.py'
sys.argv=['x']
src=open(SRC).read().split('# ---------- metrik ----------')[0]
g={'__file__':SRC,'__name__':'lsr'}
sys.path.insert(0,LAB+'adu/longsor/skrip')
exec(compile(src,SRC,'exec'),g)
cols,G,clim=g['feats'](g['F'].I_LATIH_AKHIR,g['Y'])
K,T,kodes,ltr=g['K'],g['T'],g['kodes'],g['ltr']
hasil=json.load(open(LAB+'adu/longsor/hasil.json'))['logit_koef']
ST=g['ST']; print('NaN statis',int(np.isnan(ST).sum()))
lv=np.linspace(0,1,41)
series={'r1':g['RW'][1],'r3':g['RW'][3],'r7':g['RW'][7],'r14':g['RW'][14],'r30':g['RW'][30],'m1':g['MW'][1],'m3':g['MW'][3],'api':g['API']}
kab={}
Mr=g['M']; Rr=g['R']
for i,k in enumerate(kodes):
    st=ST[i]; 
    kab[k]={'q':{n:[round(float(v),1) for v in np.quantile(a[i,ltr],lv)] for n,a in series.items()},
            'lclim':[round(float(x),4) for x in np.log(g['klim'](g['F'].I_LATIH_AKHIR,g['Y'])[0][i]+1e-6)] if False else None,
            'st':[None if np.isnan(x) else round(float(x),4) for x in st],
            'lap_prev_2025':round(float(g['PI'][i,-1]),4),   # T-1 = 2026-03-27 -> n 2025
            'rasio_m':None}
CK,KA=g['klim'](g['F'].I_LATIH_AKHIR,g['Y'])
for i,k in enumerate(kodes):
    kab[k]['lclim']=[round(float(x),4) for x in np.log(CK[i]+1e-6)]
    kab[k]['lkab']=round(float(np.log(KA[i]+1e-6)),4)
    ok=Rr[i,ltr]>1.0
    kab[k]['rasio_m']=round(float(Mr[i,ltr][ok].sum()/max(Rr[i,ltr][ok].sum(),1e-6)),3)
# cek bulan: bulan 1..12 -> clim[:, bulan-1]
koef={'fitur':hasil['fitur'],'mu':hasil['mu'],'sd':hasil['sd'],'w':hasil['w'],'b0':hasil['b0']}
# fixture
D0=g['F'].D0; import datetime as dt
fx=[]
for kd in ('1101','3171','7371'):
    i=kodes.index(kd)
    for tgl in ('2026-01-20','2026-03-10'):
        t=g['F'].idx(tgl)
        x={n:float(cols[n][i,t]) for n in hasil['fitur']}
        z=hasil['b0']+sum(w*(x[n]-m)/s for n,w,m,s in zip(hasil['fitur'],hasil['w'],hasil['mu'],hasil['sd']))
        fx.append({'kab':kd,'tgl':tgl,'R':[round(float(v),3) for v in Rr[i,t-89:t+1]],'M':[round(float(v),3) for v in Mr[i,t-89:t+1]],'z':float(z),'x':x})
json.dump({'koef':koef,'kab':kab,'periode_latih':'2008-01-01..2019-12-31','hujan':'CHIRPS 0,05 rerata kab'},open('lsr_tabel.json','w'),separators=(',',':'))
json.dump(fx,open('lsr_fixture.json','w'),separators=(',',':'))
print('ok',len(kab),len(fx))
