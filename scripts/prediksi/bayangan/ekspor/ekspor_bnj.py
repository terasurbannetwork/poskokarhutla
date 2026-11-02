# Ekspor tabel lab -> JSON ramping. Jalankan dengan LAB_ADU=<folder lab> <lab>/venv/bin/python -I <skrip>; hasil disalin ke ..
import os
import sys, json, numpy as np
LAB=os.environ['LAB_ADU'].rstrip('/') + '/'
sys.path.insert(0,LAB+'adu/banjir/skrip'); sys.argv=['x','banjir']
from lib import *
kabs,R,M,prov=muat_hujan(); Y=muat_label(kabs); pel=muat_pelaporan(kabs); st=muat_statis(kabs)
names,grp,X,sums=fitur(R,M,Y,prov,kabs,0,2019,pel,st); ni={n:i for i,n in enumerate(names)}
ko=json.load(open(os.environ['LAB_ADU'].rstrip('/') + '/adu/banjir/koefisien_kab.json'))
kab={k:{'q':v['kuantil_latih_2008_2019'],'klim':v['klim_bulan_logit'],'inarisk':v['inarisk_rerata'],'pel_2025':v['pel_logn_2025']} for k,v in ko['kab'].items()}
json.dump({'koef':ko['koef'],'b0':ko['b0'],'kab':kab,'periode_latih':'2008-01-01..2019-12-31','hujan':'CHIRPS 0,05 rerata kab'},open('bnj_tabel.json','w'),separators=(',',':'))
fx=[]
for kd in ('1101','3171','7371'):
    i=kabs.index(kd)
    for tgl in ('2026-01-20','2026-03-10'):
        t=idx(tgl); x={n:float(X[i,t,ni[n]]) for n in ko['koef']}
        z=ko['b0']+sum(ko['koef'][n]*(0.0 if np.isnan(x[n]) else x[n]) for n in x)
        fx.append({'kab':kd,'tgl':tgl,'R':[round(float(q),3) for q in R[i,t-59:t+1]],'z':float(z),'x':x})
json.dump(fx,open('bnj_fixture.json','w'),separators=(',',':')); print('ok',[round(f['z'],3) for f in fx])
