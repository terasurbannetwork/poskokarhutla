# Ekspor tabel lab -> JSON ramping. Jalankan dengan LAB_ADU=<folder lab> <lab>/venv/bin/python -I <skrip>; hasil disalin ke ..
import os
import sys, json, numpy as np
LAB=os.environ['LAB_ADU'].rstrip('/') + '/'
SRC=LAB+'adu/karhutla/skrip/adu.py'
sys.argv=['x','5','0']
src=open(SRC).read().split('# ---------- operasional')[0]
g={'__file__':SRC,'__name__':'krh'}
exec(compile(src,SRC,'exec'),g)
np_=np; F=g['F']; C=g['C']; K=g['K']; T=g['T']; kodes=g['kodes']; Ev=g['E_']
lag=g['lag']; mon=g['mon']; sejak=g['sejak']
T0,TR1,V0,V1,U0,U1=[g[k] for k in ('T0','TR1','V0','V1','U0','U1')]
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score as AP
lg=g['lg']
RAIN=['hujan1','hujan3','hujan7','hujan14','hujan30']
HS=['hs1','hs3','hs7','hs14','hs30','ev7','ev30']
cdd1=np.minimum(F['cdd1'],30); cdd5=np.minimum(F['cdd5'],30)
sej=np.minimum(F['sejak_ev'],30)
tab,_=g['klim_tab'](Ev,T0,TR1)   # (K,13)
hasil={}; out={}
def X_(s,t0,t1,step=1):
    cols=[F[n] for n in RAIN]+[cdd1,cdd5]+[lag(F[n],s) for n in HS]+[lag(sej,s)]+[F['sin'],F['cos']]
    X=np.stack([c[:,t0:t1+1:step] for c in cols],-1)
    kl=lg(tab[:,mon[t0:t1+1:step]])
    return X.reshape(-1,X.shape[-1]),kl.reshape(-1),(X.shape[1])
NAMA=RAIN+['cdd1','cdd5']+HS+['sejak_ev30','sin','cos']
y=Ev
for s in (2,3,4):
    Xtr,ktr,_=X_(s,T0,TR1,2); ytr=y[:,T0:TR1+1:2].reshape(-1)
    Xva,kva,_=X_(s,V0,V1); yva=y[:,V0:V1+1].reshape(-1)
    Xte,kte,_=X_(s,U0,U1); yte=y[:,U0:U1+1].reshape(-1)
    mu=Xtr.mean(0); sd=Xtr.std(0)+1e-6
    Z=lambda X,kl:np.c_[(X-mu)/sd,kl]
    best=None
    for Cc in (0.01,0.1):
        m=LogisticRegression(C=Cc,max_iter=400).fit(Z(Xtr,ktr),ytr); a=AP(yva,m.predict_proba(Z(Xva,kva))[:,1])
        if best is None or a>best[0]: best=(a,Cc,m)
    m=best[2]; pte=m.predict_proba(Z(Xte,kte))[:,1]
    # pembanding: klimatologi, persistensi lookup hs7
    pk=np.exp(kte)/(1+np.exp(kte))
    pers_f=np.minimum(np.round(np.expm1(lag(F['hs7'],s)[:,U0:U1+1])),30).reshape(-1)
    pb=np.digitize(np.minimum(np.round(np.expm1(lag(F['hs7'],s)[:,T0:TR1+1:2])),30).reshape(-1),[0.5,1.5,3.5,7.5,15.5])
    rate=np.array([ytr[pb==b].mean() if (pb==b).any() else ytr.mean() for b in range(6)])
    pp=rate[np.digitize(pers_f,[0.5,1.5,3.5,7.5,15.5])]
    br=lambda p:float(np.mean((p-yte)**2))
    hasil[s]={'C':best[1],'AP_val':float(best[0]),'AP_uji':float(AP(yte,pte)),'AP_klim':float(AP(yte,pk)),'AP_pers':float(AP(yte,pp+1e-3*pk)),
              'brier_uji':br(pte),'brier_klim':br(pk),'brier_pers':br(pp),'laju_uji':float(yte.mean()),'n_uji':int(len(yte))}
    out[s]={'fitur':NAMA+['logit_klim'],'mu':mu.tolist(),'sd':sd.tolist(),'w':m.coef_[0].tolist(),'b0':float(m.intercept_[0])}
    print(s,hasil[s],flush=True)
klim={k:[round(float(x),5) for x in tab[i,1:]] for i,k in enumerate(kodes)}
json.dump({'model':'logit ramping hotspot h0, hotspot berjeda tenggang+1 hari','N':5,'sensor':'VIIRS S-NPP n/h','periode_latih':'2015-04-01..2019-12-31','periode_uji':'2023-01-01..2025-12-31',
           'hujan':'CHIRPS 0,05 rerata kab','tenggang':{str(s-1):out[s] for s in out},'skor_lab':{str(s-1):hasil[s] for s in hasil},'klim':klim},open('krh_tabel.json','w'),separators=(',',':'))
# fixture
fx=[]
for kd in ('1101','1402','6204'):
    if kd not in kodes: continue
    i=kodes.index(kd)
    for tgl in ('2023-09-15','2024-08-20'):
        t=g['ix'](tgl)
        for s in (2,3,4):
            v=[float(F[n][i,t]) for n in RAIN]+[float(cdd1[i,t]),float(cdd5[i,t])]+[float(lag(F[n],s)[i,t]) for n in HS]+[float(lag(sej,s)[i,t])]+[float(F['sin'][i,t]),float(F['cos'][i,t])]
            o=out[s]; zz=(np.array(v)-np.array(o['mu']))/np.array(o['sd']); z=o['b0']+float(np.dot(zz,o['w'][:-1]))+o['w'][-1]*float(lg(tab[i,mon[t]]))
            fx.append({'kab':kd,'tgl':tgl,'tenggang':s-1,'R':[round(float(q),3) for q in g['R'][i,t-39:t+1]],'C':[int(q) for q in C[i,t-60:t+1]],'z':z})
json.dump(fx,open('krh_fixture.json','w'),separators=(',',':'))
print('ok')
