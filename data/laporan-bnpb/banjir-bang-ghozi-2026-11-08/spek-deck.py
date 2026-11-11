import json,csv
PJ='C:/Users/USER/.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir0811/'
H=json.load(open('hasil.json',encoding='utf-8')); S1,S2=H['S1'],H['S2']
SIS='GIS BNPB, 8 Nov 2026 22.06 WIB'; KO='Laporan Dit. Koordalops BNPB, 5 s.d. 7 Nov 2026'; BM='BMKG, 8 Nov 2026'; PV='PVMBG Badan Geologi, 8 Nov 2026 06.00 WIB'; SH='SIHKA Kementerian PU, 8 Nov 2026'
ANG={}; NIL={}
def A(k,v,sat,sumber,kyk='terverifikasi'):
    NIL[k]=v; ANG[k]={'berkas':'lap/banjir.json','jalur':f'[{k}]','satuan':sat,'keyakinan':kyk,'sumber':sumber}; return '{{angka:%s}}'%k
def wcsv(n,kol,rows):
    with open(PJ+'data/lap/'+n,'w',encoding='utf-8',newline='') as f:
        w=csv.writer(f); w.writerow(kol); w.writerows(rows)
# kartu dan judul
kab=A('s.kab',len(S1),'kab/kota',SIS); awas=A('s.awas',sum(r['status']=='Awas' for r in S1),'kab/kota',SIS); siaga=A('s.siaga',sum(r['status']=='Siaga' for r in S1),'kab/kota',SIS)
k11=A('s.k11',36,'kecamatan',SIS); j11=A('s.j11',H['x']['j11'],'jiwa',SIS); c11=A('s.c11',H['x']['k11'],'kecamatan',SIS)
calon=A('s.calon',len(S2),'kab/kota',SIS); tot=A('s.tot',len(S1)+len(S2)+4+2,'kab/kota',SIS+'; '+KO)
rb=lambda n:f'{n:,}'.replace(',','.')
wcsv('s1.csv',['kab','h8','h9','h10','h11','jiwa'],[[r['kab'],r['kec'],r['h9'],r['h10'],r['h11'],r['status']+', '+rb(r['terpapar'])+' jiwa kec.'] for r in S1])
LV=[r for r in S2 if r['h9']+r['h10']+r['h11']>0]
wcsv('s2.csv',['kab','h9','h10','h11','ket'],[[r['kab'],r['h9'],r['h10'],r['h11'],r['prov']+', peluang '+str(r['peluang'])+'%'+(', sudah terdampak' if r['kab']=='Pidie Jaya' else '')] for r in LV])
k8=A('s.k8',40,'kecamatan',SIS); k9=A('s.k9',21,'kecamatan',SIS); k10=A('s.k10',10,'kecamatan',SIS); p8=A('s.p8',874607,'jiwa',SIS); p11=A('s.p11',1015547,'jiwa',SIS)
pel={'Aceh Selatan':A('s.pl.as',84,'persen',SIS),'Kota Sibolga':A('s.pl.si',63,'persen',SIS)}
# dampak lapangan
ds=[A('d.ds.kk',1701,'KK',KO),A('d.ds.jiwa',6771,'jiwa',KO),A('d.ds.r',1701,'unit',KO)]
sb=[A('d.sb.kk',160,'KK',KO),A('d.sb.r',160,'unit',KO)]; lu=[A('d.lu.kk',1417,'KK',KO),A('d.lu.r',1417,'unit',KO)]; pj=[A('d.pj.kk',4969,'KK',KO),A('d.pj.j',16774,'jiwa',KO)]
# bencana lain
KO8='Laporan Dit. Koordalops BNPB, 8 Nov 2026 07.00 WIB'
g=lambda k,v,s,src=KO8:A(k,v,s,src)
gu=[g('o.md',156,'jiwa'),g('o.ung',27040,'jiwa'),g('o.rb',6353,'unit'),g('o.rs',15812,'unit'),g('o.rr',32073,'unit'),g('o.hun',425,'unit')]
hl=g('o.bad',2,'jiwa'); su=[g('o.su.kk',10378,'KK'),g('o.su.j',27479,'jiwa')]; bk=[g('o.bk.kk',1868,'KK'),g('o.bk.j',5574,'jiwa')]
ci=[g('o.ci.kk',61,'KK'),g('o.ci.j',204,'jiwa')]; bo=[g('o.bo.kk',31,'KK'),g('o.bo.j',132,'jiwa')]; ke=[g('o.ke.m',1,'jiwa'),g('o.ke.l',3,'jiwa')]; sd=g('o.sd.kk',10,'KK')
lv=A('v.sia',3,'gunung',PV); wa=A('v.was',24,'gunung',PV)
GL='GloFAS Copernicus, 8 Nov 2026'
amb=A('t.amb',70,'persen',SIS)
sig=[A('t.pos',490,'pos',SH),A('t.naik',1,'pos',SH),A('t.nc',25,'peringatan',BM),A('t.gl',192,'titik',GL),A('t.baca',281,'pos',SH),A('t.gq',21,'titik',GL),A('t.gs',H['x']['gsum'],'titik',GL)]
v=lambda k,x,s:A(k,x,s,PV)
AK=[v('v.ak.h',2,'kali'),v('v.ak.t',1,'kali'),v('v.ak.r',5,'km'),v('v.ak.p',1,'km')]
ME=[v('v.me.g',3,'kali'),v('v.me.j',2000,'m'),v('v.me.a',7,'km'),v('v.me.l',3,'km')]
SE=[v('v.se.e',20,'kali'),v('v.se.g',8,'kali'),v('v.se.b',13,'km'),v('v.se.r',5,'km'),v('v.se.l',17,'km')]
sp=lambda x:'**'+x+'**'
HARI=[{'nama':'h9','kepala':'9 Nov','fmt':'0'},{'nama':'h10','kepala':'10 Nov','fmt':'0'},{'nama':'h11','kepala':'11 Nov','fmt':'0'}]
kolom_s1=[{'nama':'kab','kepala':'Kab/Kota'},{'nama':'h8','kepala':'8 Nov','fmt':'0'}]+HARI+[{'nama':'jiwa','kepala':'Penduduk'}]
kolom_s2=[{'nama':'kab','kepala':'Kab/Kota'}]+HARI+[{'nama':'ket','kepala':'Keterangan'}]
AMB=[1,2,4,7]
_K4=json.load(open('kec4.json',encoding='utf-8'))['rows']
_Wj=json.load(open('data/banjir_data_wilayah_hari.json',encoding='utf-8')); _Sk=json.load(open('data/banjir_data_status.json',encoding='utf-8'))['kec']; _Pk=json.load(open('data/banjir_data_prakiraan72.json',encoding='utf-8'))['kec']
_Pd=json.load(open('D:/Project/Work/BNPB/poskokarhutla/public/data/penduduk.json',encoding='utf-8'))['kec']
_Wmm={k['kode']:k['hujan3_mm'] for p in _Wj['provinsi'] for k in p['kab']}
_ms={}
for k_,v_ in _Sk.items():
    q_=k_.rsplit('|',1)[0]; _ms[q_]=max(_ms.get(q_,0),v_.get('h3') or 0)
def mmk(k):
    v=_ms.get(k) or _Wmm.get(k); return round(v) if v else ''
LVN=['Normal','Waspada','Siaga','Awas']
_Q4=json.load(open('kec4s.json',encoding='utf-8'))['rows']
_rq=lambda r:[r['prov'],r['kab'],r['a'] or '',r['s'] or '',round(r['mm']) or '',r['tgl'] or '–']
_kolq=['prov','kab','a','s','mm','tgl']; wcsv('p4a.csv',_kolq,[_rq(r) for r in _Q4 if r['pr'] in ('11','13')]); wcsv('p4b.csv',_kolq,[_rq(r) for r in _Q4 if r['pr'] not in ('11','13')])
_ppv=list(dict.fromkeys(r['prov'] for r in _Q4)); wcsv('p4p.csv',['prov','n','a','s','mm'],[[p_,sum(1 for r in _Q4 if r['prov']==p_),sum(r['a'] for r in _Q4 if r['prov']==p_) or '',sum(r['s'] for r in _Q4 if r['prov']==p_),round(max(r['mm'] for r in _Q4 if r['prov']==p_))] for p_ in _ppv])
h4=A('q.h4',4,'hari',SIS)
n_pv=A('q.pv',len({r['pr'] for r in json.load(open('kec4s.json',encoding='utf-8'))['rows']}),'provinsi',SIS); p_lo=A('q.lo',min(r['p'] for r in _K4),'persen',SIS); p_hi=A('q.hi',max(r['p'] for r in _K4),'persen',SIS)
MM=lambda k,v:A('m.'+k,v,'mm','Ambang status banjir GIS BNPB')
KOL_Q=[{'nama':'prov','kepala':'Provinsi'},{'nama':'kab','kepala':'Kabupaten'},{'nama':'a','kepala':'Kec. Awas','fmt':'0','pil_ambang':[[1,'merah','kertas']],'pil_bulat':True},{'nama':'s','kepala':'Kec. Siaga','fmt':'0'},{'nama':'mm','kepala':'Puncak Hujan Tiga Hari, mm','fmt':'0','warna_isi':'merah','jumlah':False},{'nama':'tgl','kepala':'Tgl. Puncak','jumlah':False}]
_KEC=[r for r in json.load(open('kec.json',encoding='utf-8')) if r['p']>=20]
_PS={'Sumatera Utara':'Sumut','Sumatera Barat':'Sumbar','Jawa Barat':'Jabar','Jawa Tengah':'Jateng','Jawa Timur':'Jatim','DI Yogyakarta':'DIY','Kalimantan Barat':'Kalbar','Kalimantan Tengah':'Kalteng','Kalimantan Timur':'Kaltim','Kalimantan Utara':'Kaltara','Kalimantan Selatan':'Kalsel','Sulawesi Tengah':'Sulteng','Sulawesi Utara':'Sulut','Sulawesi Selatan':'Sulsel','Sulawesi Barat':'Sulbar','Sulawesi Tenggara':'Sultra','Papua Tengah':'Papteng','Papua Pegunungan':'Papeg','Papua Barat Daya':'PBD','Papua Selatan':'Papsel','Papua Barat':'Pabar','Maluku Utara':'Malut','Sumatera Selatan':'Sumsel','Nusa Tenggara Barat':'NTB','Nusa Tenggara Timur':'NTT'}
_rk=lambda r:[_PS.get(r['prov'],r['prov']),r['kab'],r['kec'],'' if r['pop'] is None else r['pop'],r['p'],int(r['hari'].split()[0])]
_tg=len(_KEC)//2+len(_KEC)%2
_kb={}
for r in _KEC:
    g=_kb.setdefault((r['prov'],r['kab']),{'n':0,'pop':0,'ada':False,'p':0,'tgl':None})
    g['n']+=1
    if r['pop'] is not None: g['pop']+=r['pop']; g['ada']=True
    if r['p']>g['p']: g['p']=r['p']; g['tgl']=int(r['hari'].split()[0])
_rb=sorted(_kb.items(),key=lambda kv:(-kv[1]['p'],-kv[1]['n'],kv[0][1]))
wcsv('p1.csv',['prov','kab','n','pop','p','tgl'],[[k[0],k[1],g['n'],g['pop'] if g['ada'] else '',g['p'],g['tgl']] for k,g in _rb])
print('per kab',[(k[1],g['n'],g['pop'],g['p'],g['tgl']) for k,g in _rb])
n_kec=A('p.kec',len(_KEC),'kecamatan',SIS); n_kab=A('p.kab',len({r['prov']+r['kab'] for r in _KEC}),'kab/kota',SIS); p_top=A('p.top',max(r['p'] for r in _KEC),'persen',SIS); p_min=A('p.min',20,'persen',SIS); p_ang=A('p.ang',51,'anggota',SIS)
print('tabel peluang',len(_KEC),len({r['prov']+r['kab'] for r in _KEC}),_tg)
KOL_P=[{'nama':'prov','kepala':'Provinsi','bobot':1.1},{'nama':'kab','kepala':'Kab/Kota','bobot':1.2},{'nama':'n','kepala':'Jumlah Kecamatan','fmt':'0'},{'nama':'pop','kepala':'Penduduk','fmt':'0'},{'nama':'p','kepala':'Peluang Tertinggi (%)','fmt':'0'},{'nama':'tgl','kepala':'Puncak (Tgl Nov)','fmt':'0'}]
_pk0={}
for r in json.load(open('kec.json',encoding='utf-8')):
    q=r['key'].split('|')[0]+'|'+r['kab']; _pk0[q]=max(_pk0.get(q,0),r['p'])
_mulai=lambda r:'9 Nov' if r['h9'] else '10 Nov' if r['h10'] else '11 Nov'
_a1=sorted(S2,key=lambda r:(int(_mulai(r).split()[0]),-max(r['h9'],r['h10'],r['h11']),-r['peluang']))
_PANTAU=[('11|Aceh Selatan','Peluang tinggi'),('12|Kota Sibolga','Peluang tinggi'),('12|Padang Lawas','Sinyal sungai'),('12|Labuhanbatu','Sinyal sungai'),('12|Dairi','Sinyal sungai'),('14|Rokan Hulu','Sinyal sungai'),('14|Rokan Hilir','Sinyal sungai'),('11|Aceh Jaya','Sinyal sungai'),('11|Bireuen','Sinyal sungai')]
_NP={'11':'Aceh','12':'Sumatera Utara','13':'Sumatera Barat','14':'Riau','33':'Jawa Tengah','34':'DI Yogyakarta','72':'Sulawesi Tengah'}
_ALT=[{'no':i+1,'kode':r['kode'],'kab':r['kab'],'prov':r['prov'],'kel':_mulai(r),'tingkat':'Prioritas','dasar':'Prediksi Siaga','kec':max(r['h9'],r['h10'],r['h11']),'p':r['peluang']} for i,r in enumerate(_a1)]
_ALT+=[{'no':len(_a1)+i+1,'kode':k,'kab':k.split('|')[1],'prov':_NP[k[:2]],'kel':'Dipantau','tingkat':'Dipantau','dasar':d_,'kec':0,'p':_pk0.get(k,0)} for i,(k,d_) in enumerate(_PANTAU)]
json.dump(_ALT,open('alt.json','w',encoding='utf-8'),ensure_ascii=False)
wcsv('alt.csv',['kab','prov','mulai','dasar','kec','p'],[[r['kab'],r['prov'],r['kel'] if r['tingkat']=='Prioritas' else 'Dipantau',r['dasar'],r['kec'],r['p']] for r in _ALT])
n_pr=A('a.pr',len(_a1),'kab/kota',SIS); n_pt=A('a.pt',len(_PANTAU),'kab/kota',SIS)
_hit=lambda m:sum(1 for r in _ALT if r['kel']==m)
_b=lambda n:next(r for r in S2 if r['kab']==n)
_pk=lambda n:max(_b(n)['h9'],_b(n)['h10'],_b(n)['h11'])
_kt=lambda n:A('c.k.'+n.replace(' ','_'),_pk(n),'kecamatan',SIS)
_G3=['Nias Utara','Simalungun','Pidie Jaya','Pidie','Aceh Tenggara','Nias','Nias Selatan','Pesisir Selatan','Labuhanbatu Utara']
_G2=['Magelang','Sleman','Klaten']
assert len(_G3)+len(_G2)+1==len(S2), [r['kab'] for r in S2]
_p2=sum(_b(n)['terpapar'] for n in _G2); _p3=sum(_b(n)['terpapar'] for n in _G3)
assert _p2+_p3==H['x']['j11'],(_p2,_p3,H['x']['j11'])
print('kelompok',_b('Donggala')['terpapar'],_p2,_p3)
tp1=A('c.p1',_b('Donggala')['terpapar'],'jiwa',SIS); tp2=A('c.p2',_p2,'jiwa',SIS); tp3=A('c.p3',_p3,'jiwa',SIS)
pmax=A('c.pm',16,'persen',SIS); pat=A('c.pat',_b('Aceh Tenggara')['peluang'],'persen',SIS); p0=A('c.p0',0,'persen',SIS); pdg=A('c.pdg',_b('Donggala')['peluang'],'persen',SIS)
_W=json.load(open('data/banjir_data_wilayah_hari.json',encoding='utf-8'))
_st={k['kode']:k['status'] for p in _W['provinsi'] for k in p['kab'] if not k['kode'].endswith('|None')}   # dua baris sumber tanpa nama kabupaten tidak dihitung
_lap={r['prov']+'|'+r['kab'] for r in json.load(open('lap.json',encoding='utf-8')) if not r['surut']}; _cal={r['kode'] for r in S2}-_lap
_was=sum(1 for k,v in _st.items() if v=='Waspada' and k not in _lap and k not in _cal)
_LP=json.load(open('lap.json',encoding='utf-8')); KO1='Laporan Dit. Koordalops BNPB, 1 s.d. 8 Nov 2026'
_bl=[r for r in _LP if not r['surut']]; _sr=[r for r in _LP if r['surut']]
tg1=A('s.tg1',1,'tanggal',KO1); kk4=A('s.kk4',sum(r['kk'] or 0 for r in _bl),'KK',KO1); t4=A('s.t4',len(_bl),'kab/kota',KO1)
_PR={'11':'Aceh','12':'Sumatera Utara','13':'Sumatera Barat','35':'Jawa Timur'}
_ag=lambda xs,f:(sum(r[f] for r in xs if r[f]) if any(r[f] for r in xs) else '')
_LK=json.load(open('lapkec.json',encoding='utf-8')); _SLS=json.load(open('selesai.json',encoding='utf-8')); _lpu=sorted(_LP,key=lambda r:(['11','12','13','35'].index(r['prov']),r['surut'],-(r['kk'] or 0)))
_nk=lambda r:len(_LK[r['prov']+'|'+r['kab']]['kec'].split(', ')) if _LK[r['prov']+'|'+r['kab']]['kec'] else ''
kc5=A('s.kc5',sum(_nk(r) or 0 for r in _LP if not r['surut']),'kecamatan',KO1)
wcsv('lp.csv',['prov','kab','kec','mulai','selesai','kk','ungsi','st'],[[_PR[r['prov']],r['kab'],_nk(r),_LK[r['prov']+'|'+r['kab']]['mulai'],_SLS[r['prov']+'|'+r['kab']] or '–',r['kk'] or '',r['ungsi'] or '','Surut' if r['surut'] else 'Belum surut'] for r in _lpu])
print('lap',len(_LP),len(_bl),[r['kab'] for r in _bl],sum(r['kk'] or 0 for r in _bl))
LEG=[{'warna':'merah','label':'Belum surut','nilai':t4,'ikon':'peringatan','tint':'tint.bahaya.pita'},
     {'warna':'skala.air.3','label':'Sudah surut','nilai':A('l.surut',len(_sr),'kab/kota',KO1),'ikon':'rumah','tint':'tint.basah.pita'}]
print('legenda',len(_cal),_was,len(_lap))
# lampiran: semua kab/kota berstatus, satu status per daerah, prioritas Terdampak > Awas > Siaga > Calon Siaga > Waspada
_nm={p['kode']:p['nama'] for p in _W['provinsi']}; _ka={k['kode']:k['nama'] for p in _W['provinsi'] for k in p['kab']}
_st2={}
for k,v in _st.items():
    if k in _lap: _st2[k]='Terdampak'
    elif v in ('Awas','Siaga'): _st2[k]=v
    elif k in _cal: _st2[k]='Berpeluang'
    elif v=='Waspada': _st2[k]='Waspada'
for k in _lap: _st2[k]='Terdampak'
for r_ in _LP:
    if r_['surut']: _st2[r_['prov']+'|'+r_['kab']]='Surut'
_ur_st=['Terdampak','Surut','Awas','Siaga','Berpeluang','Waspada']
_d=sorted(_st2.items(),key=lambda kv:(_ur_st.index(kv[1]),kv[0][:2],kv[0]))
_bar=18; _set=3
print('lampiran',len(_d),{u:sum(1 for _,v in _d if v==u) for u in _ur_st})
_hlm=[_d[n:n+_bar*_set] for n in range(0,len(_d),_bar*_set)]
_rows=[]
for hl in _hlm:
    nb=_bar; blok=[[chr(0x200b)]*(3*_set) for _ in range(nb)]
    for i,(k,v) in enumerate(hl):
        c,r=divmod(i,nb); blok[r][3*c:3*c+3]=[_ka.get(k) or k.split('|')[1],_nm.get(k[:2],'Jawa Timur'),v]
    _rows+=blok
print('nama kosong',[k for k,_ in _d if not _ka.get(k)][:8])
wcsv('lamp.csv',[f'{n}{c}' for c in range(_set) for n in ('kab','prov','status')],_rows)
KOL_L=[{'nama':f'{n}{c}','kepala':h} for c in range(_set) for n,h in (('kab','Kab/Kota'),('prov','Provinsi'),('status','Status'))]
d9=A('t.d9',9,'',SIS)
lv13=A('s.lv13',sum(1 for r in S2 if r['h9']+r['h10']+r['h11']>0),'kab/kota',SIS)
wcsv('s2n.csv',['hari','kec'],[['8 Nov',40],['9 Nov',21],['10 Nov',10],['11 Nov',36]])
# mitigasi
M1=[('Deli Serdang','Bupati putuskan perpanjangan Tanggap Darurat sebelum 9 Nov'),
('Pidie Jaya','Tambal tanggul jebol; siapkan evakuasi Trienggadeng, Meureudu'),
('Serdang Bedagai','Tuntaskan pendataan dan pembersihan rumah terdampak'),
('Langkat','Konfirmasi status surut ke BPBD, laporan terakhir 1 Nov'),
('Lumajang','Buka akses jalan dan listrik; siaga lahar Besuk Kobokan'),
('Aceh Barat Daya','Siapkan evakuasi Kuala Batee, Babah Rot, Manggeng'),
('Aceh Barat','Posko Sungai Mas, Pante Ceureumen; perahu di Meureubo dan Bubon'),
('Aceh Tengah','Siapkan evakuasi Atu Lintang; pantau ruas Ketol, Rusip Antara'),
('Pasaman Barat','Posko Luhak Nan Duo; siapkan evakuasi Gunung Tuleh'),
('Nagan Raya','Posko Seunagan, Kuala; pantau permukiman lereng Darul Makmur'),
('Tapanuli Tengah','Posko Andam Dewi, Sorkam; siapkan jalur evakuasi Barus'),
('Aceh Singkil','Posko Gunung Meriah; perahu ke Kota Baharu dan Singkil'),
('Mandailing Natal','Posko Batahan, Huta Bargot; pantau lereng Batang Natal'),
('Padang Lawas Utara','Siapkan evakuasi Padang Bolak Tenggara, Portibi'),
('Kota Subulussalam','Siapkan evakuasi Penanggalan; periksa tanggul Rundeng'),
('Humbang Hasundutan','Siapkan evakuasi Parlilitan; pantau ruas Tarabintang')]
M2=[('Aceh Tenggara','Siapkan evakuasi Badar; siapkan logistik awal di BPBD'),
('Pidie','Siapkan evakuasi Glumpang Baro; pantau ruas Geumpang'),
('Nias Utara','Posko Afulu, Lotu sebelum 11 Nov; pantau lereng Alasa Talumuzoi'),
('Simalungun','Posko Dolog Masagal, Panombeian Pane; bersihkan saluran Raya'),
('Donggala','Posko Sojol, Sojol Utara mulai 9 Nov; siapkan evakuasi pesisir'),
('Magelang','Siapkan evakuasi Muntilan, Ngluwar; pantau lahar saat hujan'),
('Sleman','Siapkan evakuasi Kalasan, Mlati; pantau lahar Boyong, Gendol'),
('Nias','Siapkan evakuasi Bawolato; jaga jalur ke Gunungsitoli'),
('Nias Selatan','Siapkan evakuasi Somambawa; siapkan logistik kepulauan'),
('Pesisir Selatan','Siapkan evakuasi Bayang; bersihkan muara dan drainase'),
('Labuhanbatu Utara','Siapkan evakuasi Na IX-X; periksa bantaran sungai'),
('Klaten','Siapkan evakuasi Kemalang; pantau Kali Woro saat hujan'),
('Aceh Selatan','Pantauan khusus: Pasi Raja, Kluet Utara, Kluet Selatan, Trumon'),
('Kota Sibolga','Pantauan khusus: Sibolga Selatan; bersihkan drainase kota')]
_ur=[r['kab'] for r in S2]; M2=sorted(M2,key=lambda m:_ur.index(m[0]) if m[0] in _ur else 99)
wcsv('m1.csv',['kab','langkah'],M1); wcsv('m2.csv',['kab','langkah'],M2)
oranye=lambda t:t.replace('}}','|oranye}}')
P_AWAS=['skala.api.5','skala.api.5','kertas']; P_SIAGA=['skala.api.3','skala.api.3','teks']; P_DAMPAK=['skala.air.5','skala.air.5','kertas']; P_CALON=['skala.netral.3','skala.netral.3','kertas']
pil1={k:(P_AWAS if st=='Awas' else P_SIAGA) for k,st in ((r['kab'],r['status']) for r in S1)}; pil1.update({k:P_DAMPAK for k in ('Deli Serdang','Serdang Bedagai','Lumajang')})
pil2={k:(P_DAMPAK if k=='Pidie Jaya' else P_CALON) for k,_ in M2}
KM=lambda pil:[{'nama':'kab','kepala':'Kab/Kota','bobot':1.3},{'nama':'langkah','kepala':'Langkah BPBD bersama BNPB','bobot':3.6,'rata':'l'}]
_LG=json.load(open('logpal.json',encoding='utf-8')); LGS='BPBD Aceh dan BPBD Sumut, 8 Nov 2026; Gudang UPT Padang (DSP); Poslog BNPB Kualanamu, 25 Okt 2026'
kb_p=A('k.p',2,'provinsi',LGS); kb_n=A('k.n',4,'jenis',LGS)
wcsv('lg4.csv',['prov','jenis','jml','stok2','kurang'],[['Aceh','Selimut Tebal Standar BNPB','5.000 lembar','307 lembar','4.693 lembar'],['Aceh','Family Kit (jika tersedia)','2.500 boks','Tidak tercatat','2.500 boks'],['Sumatera Utara','Tenda Peleton 6x8','8 unit','Tidak tercatat','8 unit'],['Sumatera Utara','Senter Tahan Air','12 unit','Tidak tercatat','12 unit'],['Sumatera Barat','Ditangani gudang logpal Sumbar','–','–','–']])
wcsv('lg3.csv',['prov','jenis','jml'],[['Sumatera Utara','Tenda Peleton 6x8','8 unit'],['Sumatera Utara','Senter Tahan Air','12 unit'],['Aceh','Selimut Tebal','5.000 lembar'],['Aceh','Mie Instan','2.500 dus'],['Aceh','Air Minum Gelas','2.500 dus'],['Aceh','Biskuit','5.000 pack'],['Aceh','Minyak Goreng','1.500 kg'],['Aceh','Kecap Botol','1.000 dus'],['Aceh','Sambal Botol','1.000 dus'],['Aceh','Gula Pasir','5.000 kg'],['Aceh','Family Kit (jika ada)','2.500 boks']])
lg_t=A('g.t',138.5,'ton',LGS); lg_n=A('g.n',_LG['n'],'provinsi',LGS); lg_p=A('g.p',_LG['pct'],'persen',LGS); lg_b=A('g.b',_LG['nb'],'provinsi',LGS)
_gp=lambda n,h,g:{'nama':n,'kepala':h,'fmt':'0','grup':g}
KOL_LG=[{'nama':'prov','kepala':'Provinsi'},_gp('alat','Alat Berat','Peralatan utama'),_gp('perahu','Perahu','Peralatan utama'),_gp('genset','Genset','Peralatan utama'),_gp('air','Air Bersih','Peralatan utama'),_gp('pompa','Pompa','Peralatan utama'),_gp('tenda','Tenda','Logistik pengungsian'),_gp('velbed','Velbed','Logistik pengungsian'),_gp('matras','Kasur','Logistik pengungsian'),_gp('selimut','Selimut','Logistik pengungsian'),_gp('obat','Obat','Logistik pengungsian')]
_JL=json.load(open('jalur.json',encoding='utf-8')); JLS='Perkiraan dari jarak dan kecepatan rata-rata tiap moda; belum dikonfirmasi operator angkutan'
_gs=lambda r:'Kualanamu' if r['kp'] in ('11','12') else 'UPT Padang'
_jrow=[[r['prov'],f"{i_+1}. {r['kab']}",_gs(r),r['moda'],f"{r['jam']} jam",r['turun']] for i_,r in enumerate(_JL['sum'])]
_jk=['prov','kab','asal','moda','jam','turun']; wcsv('jla.csv',_jk,[x for x,r in zip(_jrow,_JL['sum']) if r['kp'] in ('11','12')]); wcsv('jlb.csv',_jk,[x for x,r in zip(_jrow,_JL['sum']) if r['kp'] not in ('11','12')])
_jp=list(dict.fromkeys(r['prov'] for r in _JL['sum'])); _jq=lambda p_:[r for r in _JL['sum'] if r['prov']==p_]
_jm=[]
for p_ in _jp:
    for m_ in ('Darat','Laut','Udara'):
        xs_=[r for r in _jq(p_) if r['moda']==m_]
        if xs_:
            tr_=sorted({r['turun'].replace('Pelabuhan ','').replace('Bandara ','') for r in xs_}); a_,b_=min(r['jam'] for r in xs_),max(r['jam'] for r in xs_)
            _jm.append([p_,_gs(xs_[0]),m_,str(len(xs_)),f'{a_} jam' if a_==b_ else f'{a_}-{b_} jam',', '.join(tr_)])
wcsv('jl.csv',['prov','asal','moda','n','jam','turun'],_jm)
jn=A('j.n',len(_JL['sum']),'kab/kota',JLS); jm=A('j.m',_JL['jam1'],'jam',JLS); jnd=A('j.nd',_JL['nd'],'kab/kota',JLS); jnl=A('j.nl',_JL['nl'],'kab/kota',JLS); jnu=A('j.nu',_JL['nu'],'kab/kota',JLS)
ju0=A('j.u0',_JL['u0'],'jam',JLS,'estimasi-model'); ju1=A('j.u1',_JL['u1'],'jam',JLS); jl1=A('j.l1',max(r['laut'] for r in _JL['sum'] if r['laut']!=''),'jam',JLS,'estimasi-model'); jd1=A('j.d1',_JL['d1'],'jam',JLS,'estimasi-model')
_q4=json.load(open('kec4s.json',encoding='utf-8'))['rows']; _bs={r['prov']+'|'+r['kab'] for r in _LP if not r['surut']}
q_a=A('q.a',sum(r['a'] for r in _q4),'kecamatan',SIS); q_s=A('q.s',sum(r['s'] for r in _q4),'kecamatan',SIS)
q_ka=A('q.ka',sum(1 for r in _q4 if r['a'] and r['k'] not in _bs),'kab/kota',SIS); q_ks=A('q.ks',sum(1 for r in _q4 if not r['a'] and r['k'] not in _bs),'kab/kota',SIS)
_hr=json.load(open('data/banjir_data_prakiraan72.json',encoding='utf-8'))['hari']; q_tg=f"{int(_hr[0][8:])}-{int(_hr[-1][8:])} Nov"
SPK={'judul_tengah_y':56,'kajian':'harian','format':'harian','tanggal':'2026-11-08','cut_off':'8 Nov 2026, 22.06 WIB','pesan_kunci':'Banjir terkonsentrasi di Aceh, Sumatera Utara, Sumatera Barat dan meluas lagi 11 November; mitigasi per kab/kota disiapkan sebelum puncak.',
'judul_dokumen':'Situasi Banjir dan Bencana Lain','_catatan':'Permintaan Bang Ghozi 8 Nov 2026, empat slide tanpa sampul.','slide':[
{'jenis':'temuan-peta','jenis_slide':'peta','seri':'banjir','judul_bentuk':'temuan','rasio':0.49,'cut_off':False,'pesan':'Peta banjir, dampak, prediksi','sumber':'Laporan Dit. Koordalops BNPB, 1 s.d. 8 Nov 2026; pengungsi dari laporan yang memuatnya',
 'judul':f'Terdapat {oranye(t4)} kab/kota ({oranye(kc5)} kecamatan, {oranye(kk4)} KK) terdampak banjir pada periode {tg1} s.d. 8 November 2026',
 'peta':{'png':'petanya/banjir-081126.png','keyakinan':'estimasi-model','sumber':SIS,'unsur_tampil':False,'legenda':{'kartu':True,'judul':'Status','item':LEG}},
 'panel':{'tanpa_kepala':True,'pita_kelompok':True,'pita_tinggi_pt':17,'peringkat':True,'data':{'csv':'data/lap/lp.csv','keyakinan':'terverifikasi','sumber':KO1,'kolom':[{'nama':'prov','kepala':'Provinsi'},{'nama':'kab','kepala':'Kab/Kota'},{'nama':'kec','kepala':'Kec.','fmt':'0'},{'nama':'mulai','kepala':'Mulai'},{'nama':'selesai','kepala':'Selesai'},{'nama':'kk','kepala':'KK','fmt':'0'},{'nama':'ungsi','kepala':'Mengungsi','fmt':'0'},{'nama':'st','kepala':'Kondisi','pil':{'Belum surut':['tint.bahaya.pita','tint.bahaya.pita','teks','merah','peringatan','kertas'],'Surut':['tint.basah.pita','tint.basah.pita','teks','skala.air.3','rumah','kertas']}}]}}},
{'jenis':'temuan-peta','jenis_slide':'peta','seri':'banjir','judul_bentuk':'temuan','rasio':0.55,'cut_off':False,'pesan':'Daerah dengan probabilitas banjir','sumber':'GIS BNPB, 8 Nov 2026 22.06 WIB; Laporan Dit. Koordalops BNPB; kartu = jumlah kab/kota',
 'judul':f'Terdapat {oranye(q_a)}'+chr(160)+f'kecamatan berstatus Awas, {oranye(q_s)}'+chr(160)+f'Siaga di {oranye(n_pv)}'+chr(160)+f'provinsi pada periode {h4}'+chr(160)+'hari ke depan ('+'{{sorot:'+q_tg+'}}'+')',
 'peta':{'png':'petanya/probabilitas-081126.png','keyakinan':'estimasi-model','sumber':SIS,'unsur_tampil':False,'legenda':{'kartu':True,'judul':'Status','item':[
   {'warna':'skala.air.5','label':'Terdampak','nilai':t4,'ikon':'rumah','tint':'tint.basah.pita'},{'warna':'skala.api.5','label':'Awas','nilai':q_ka,'ikon':'peringatan','tint':'tint.bahaya.pita'},{'warna':'skala.api.3','label':'Siaga','nilai':q_ks,'ikon':'banjir','tint':'tint.api.pita'}]}},
 'panel':{'tanpa_kepala':True,'peringkat':True,'total':True,'baris_maks_pt':52,'data':{'csv':'data/lap/p4p.csv','keyakinan':'terverifikasi','sumber':SIS,'kolom':[{'nama':'prov','kepala':'Provinsi'},{'nama':'n','kepala':'Kab/Kota','fmt':'0'},{'nama':'a','kepala':'Kec. Awas','fmt':'0'},{'nama':'s','kepala':'Kec. Siaga','fmt':'0'},{'nama':'mm','kepala':'Hujan, mm','fmt':'0','jumlah':False,'warna_isi':'merah'}]}}},
{'jenis':'temuan-peta','jenis_slide':'peta','seri':'banjir','judul_bentuk':'temuan','rasio':0.47,'cut_off':False,'pesan':'Alternatif peta dua tingkat','sumber':'GIS BNPB, GloFAS Copernicus, 8 Nov 2026 22.06 WIB',
 'judul':f'{oranye(n_pr)} kab/kota paling berpotensi banjir pada {{{{sorot:9-11 November}}}}; {oranye(n_pt)} kab/kota lain perlu dipantau',
 'peta':{'png':'petanya/alternatif-081126.png','keyakinan':'estimasi-model','sumber':SIS,'unsur_tampil':False,'legenda':{'kartu':True,'judul':'Mulai','item':[
   {'warna':'skala.api.5','label':'Mulai 9 Nov','nilai':A('a.c1',_hit('9 Nov'),'kab/kota',SIS),'ikon':'kalender','tint':'tint.bahaya.pita'},
   {'warna':'skala.emas.4','label':'Mulai 10 Nov','nilai':A('a.c2',_hit('10 Nov'),'kab/kota',SIS),'ikon':'kalender','tint':'tint.netral.muda'},
   {'warna':'skala.api.3','label':'Mulai 11 Nov','nilai':A('a.c3',_hit('11 Nov'),'kab/kota',SIS),'ikon':'kalender','tint':'tint.api.pita'},
   {'warna':'skala.netral.3','label':'Dipantau','nilai':n_pt,'ikon':'prabencana','tint':'tint.netral.pita'}]}},
 'panel':{'judul':'Nomor pada peta, urut tanggal mulai','ikon':'banjir','nada':'netral','peringkat':True,'data':{'csv':'data/lap/alt.csv','keyakinan':'terverifikasi','sumber':SIS,'kolom':[{'nama':'kab','kepala':'Kab/Kota','bobot':1.5},{'nama':'prov','kepala':'Provinsi','bobot':1.4},{'nama':'mulai','kepala':'Mulai','bobot':.8},{'nama':'dasar','kepala':'Dasar','bobot':1.15},{'nama':'kec','kepala':'Kec','fmt':'0'},{'nama':'p','kepala':'Peluang (%)','fmt':'0'}]}}},
{'jenis':'tabel-peringkat','jenis_slide':'tabel','seri':'banjir','judul_bentuk':'temuan','rasio':1.0,'pesan':'Logistik dan peralatan','cut_off':False,'sumber':LGS,
 'judul':f'{oranye(kb_p)}'+chr(160)+f'provinsi mengajukan {oranye(kb_n)}'+chr(160)+'jenis kebutuhan; kekurangan di luar stok Poslog Kualanamu harus disiapkan',
 'tabel':{'tanpa_kepala':True,'peringkat':True,'pita_kelompok':True,'pita_hitung':False,'pita_tinggi_pt':30,'baris_maks_pt':120,'skala_huruf':1.5,'data':{'csv':'data/lap/lg4.csv','keyakinan':'terverifikasi','sumber':LGS,'kolom':[{'nama':'prov','kepala':'Provinsi'},{'nama':'jenis','kepala':'Kebutuhan','bobot':2.2},{'nama':'jml','kepala':'Jumlah Diajukan','bobot':.8},{'nama':'stok2','kepala':'Stok Poslog Kualanamu','bobot':1.1},{'nama':'kurang','kepala':'Kekurangan yang Harus Disiapkan','bobot':1.3}]}}},
{'jenis':'temuan-peta','jenis_slide':'peta','seri':'jalur','judul_bentuk':'temuan','rasio':0.48,'cut_off':False,'pesan':'Jalur logistik','sumber':JLS,
 'judul':f'{oranye(jn)}'+chr(160)+'kab/kota berpotensi banjir dilayani dari Poslog Kualanamu dan Gudang UPT Padang, paling lama '+f'{oranye(jm)}'+chr(160)+'jam',
 'peta':{'png':'petanya/jalur-081126.png','keyakinan':'estimasi-model','sumber':JLS,'unsur_tampil':False,'legenda':{'kartu':True,'judul':'Moda','item':[
   {'warna':'skala.api.3','label':'Darat','nilai':jnd+' kab/kota','ikon':'wilayah','tint':'tint.api.pita'},{'warna':'skala.air.3','label':'Laut','nilai':jnl+' kab/kota','ikon':'banjir','tint':'tint.basah.pita'},{'warna':'merah','label':'Udara','nilai':jnu+' kab/kota','ikon':'peringatan','tint':'tint.bahaya.pita'}]}},
 'panel':{'tanpa_kepala':True,'peringkat':True,'baris_maks_pt':62,'skala_huruf':1.15,'data':{'csv':'data/lap/jl.csv','keyakinan':'estimasi-model','sumber':JLS,'kolom':[{'nama':'prov','kepala':'Provinsi','bobot':1.35},{'nama':'asal','kepala':'Gudang','bobot':1},{'nama':'moda','kepala':'Moda','bobot':.6},{'nama':'n','kepala':'Kab/Kota','bobot':.7},{'nama':'jam','kepala':'Waktu','bobot':.85},{'nama':'turun','kepala':'Turun di','bobot':1.25}]}}},
{'jenis':'tabel-peringkat','jenis_slide':'tabel','seri':'akhir','judul_bentuk':'temuan','rasio':0.5,'pesan':'Mitigasi tiap kab/kota','cut_off':False,'sumber':'Usulan langkah berdasarkan GIS BNPB, 8 Nov 2026 22.06 WIB; Laporan Dit. Koordalops BNPB, 5 s.d. 7 Nov 2026','judul':f'Mitigasi {oranye(tot)} kab/kota: {oranye(t4)} terdampak ditangani sekarang; {oranye(awas)} Awas dan {oranye(siaga)} Siaga disiapkan sebelum 9 November',
 'tabel':{'judul_panel':'Lakukan sekarang (disorot), lalu siapkan sebelum 9 November','ikon':'tanggap-darurat','nada':'netral','peringkat':False,'data':{'csv':'data/lap/m1.csv','sorot':['Deli Serdang','Pidie Jaya','Serdang Bedagai','Langkat','Lumajang'],'keyakinan':'penilaian-pakar','sumber':SIS+'; '+KO,'kolom':KM(pil1)}},
 'panel':{'judul':'Berpeluang banjir: siapkan sebelum 11 November','ikon':'prabencana','nada':'air','peringkat':False,'data':{'csv':'data/lap/m2.csv','keyakinan':'penilaian-pakar','sumber':SIS,'kolom':KM(pil2)}}},
]}
json.dump(NIL,open(PJ+'data/lap/banjir.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
json.dump({'angka':ANG},open(PJ+'data/angka.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
_lpk={r['prov']+'|'+r['kab']:r for r in _LP}
_HR=['8 Nov','9 Nov','10 Nov','11 Nov']
def _tgl(t):
    return f"{int(t[8:])} "+{'10':'Okt','11':'Nov'}[t[5:7]] if t else ''
def _lamp(k,v):
    kc=[(n,p) for n,p in _Pk.items() if n.startswith(k+'|') and max(p['b'])>=1]
    pp=[_Pd[n] for n,_ in kc if _Pd.get(n) is not None]
    harian=[max((p['b'][d] for _,p in kc),default=0) for d in range(4)]
    o={'kab':_ka.get(k) or k.split('|')[1],'kp':k[:2],'prov':_nm.get(k[:2],'Jawa Timur'),'st':v,'mm':mmk(k),'kec':len(kc) or '','pop':sum(pp) if pp else '','puncak':_HR[harian.index(max(harian))] if kc else ''}
    r=_lpk.get(k)
    if r: o.update(awal=_tgl(r['hari'][0]),kabar=_tgl(r['hari_akhir']),kk=r['kk'] or '',jiwa=r['jiwa'] or '',ungsi=r['ungsi'] or '',kondisi=r['kondisi'])
    return o
_RP='D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/banjir-bang-ghozi-2026-11-08/'
json.dump([_lamp(k,v) for k,v in _d],open(_RP+'lampiran.json','w',encoding='utf-8'),ensure_ascii=False)
import os as _os
_nh=json.load(open(_RP+'lampiran-hal.json'))['n'] if _os.path.exists(_RP+'lampiran-hal.json') else 0
SPK['slide'].append({'jenis':'impor','pptx':'C:/Users/USER/.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir0811/data/lap/slide3-isi.pptx','halaman':7+_nh,'sumber':'GIS BNPB'})
for _i in range(_nh): SPK['slide'].append({'jenis':'impor','pptx':'C:/Users/USER/.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir0811/data/lap/slide3-isi.pptx','halaman':7+_i,'sumber':SIS+'; '+KO1})
import copy as _cp
_KL=json.load(open('kec4l.json',encoding='utf-8')); _rl=_KL['rows']; _urL=list(dict.fromkeys(r['prov'] for r in _rl)); _rlb=sorted(_rl,key=lambda r:_urL.index(r['prov']))
wcsv('p4l.csv',['prov','kab','n','pop','mm','tgl','st'],[[r['prov'],r['kab'],r['n'],r['pop'] if r['ada'] else '',mmk(r['k']),f"{r['tgl']} Nov",LVN[_KL['lv'][r['k']]]] for r in _rlb])
_SL=_cp.deepcopy(SPK['slide'][1]); LN_=lambda k,v:A('ml.'+k,v,'mm','Ambang status longsor GIS BNPB')
_SL.update(pesan='Daerah dengan probabilitas longsor',sumber='GIS BNPB, 8 Nov 2026 22.06 WIB; legenda = ambang hujan 3 hari; probabilitas = persen skenario hujan ECMWF mencapai Siaga',
 judul=f'Dalam {h4}'+chr(160)+f"hari ke depan, terdapat {oranye(A('l.pv',len(_urL),'provinsi',SIS))}"+chr(160)+f"provinsi dengan probabilitas longsor untuk status Siaga")
_SL['peta']['png']='petanya/longsor-081126.png'; _SL['panel']['data']['csv']='data/lap/p4l.csv'
for _it,_nl,_v,_sim in zip(_SL['peta']['legenda']['item'],('aw','si','wa','no'),(90,60,30,30),('≥ ','≥ ','≥ ','< ')): _it['nilai']=_sim+LN_(_nl,_v)+' mm'
SPK['slide'].insert(3,_SL)
json.dump(NIL,open(PJ+'data/lap/banjir.json','w',encoding='utf-8'),ensure_ascii=False,indent=0); json.dump({'angka':ANG},open(PJ+'data/angka.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
_gq=lambda n,h,g:{'nama':n,'kepala':h,'fmt':'0','grup':g}
SPK['slide'].append({'jenis':'tabel-peringkat','jenis_slide':'tabel','seri':'jalur','judul_bentuk':'deskriptif','rasio':1.0,'pesan':'Lampiran persediaan','cut_off':False,'sumber':'Rekap PDW I, 8 Nov 2026; Gudang UPT Padang; Poslog Kualanamu, 25 Okt 2026','judul':'Lampiran: daftar {{sorot:persediaan logistik dan peralatan}} di setiap provinsi','tabel':{'tanpa_kepala':True,'peringkat':False,'baris_maks_pt':46,'data':{'csv':'data/lap/lg.csv','keyakinan':'terverifikasi','sumber':'Rekap PDW I, 8 Nov 2026; Gudang UPT Padang','kolom':[{'nama':'prov','kepala':'Provinsi'},_gq('alat','Alat Berat','Peralatan utama'),_gq('perahu','Perahu','Peralatan utama'),_gq('genset','Genset','Peralatan utama'),_gq('air','Air Bersih','Peralatan utama'),_gq('pompa','Pompa','Peralatan utama'),_gq('chainsaw','Chainsaw','Peralatan utama'),_gq('geobag','Geobag','Peralatan utama'),_gq('tenda','Tenda','Logistik pengungsian'),_gq('velbed','Velbed','Logistik pengungsian'),_gq('matras','Matras, Kasur','Logistik pengungsian'),_gq('selimut','Selimut','Logistik pengungsian'),_gq('terpal','Terpal','Logistik pengungsian'),_gq('obat','Obat','Logistik pengungsian')]}}})
for _s in SPK['slide']: _s['logo_kampus']='foto/kris-header.png'
SPK['slide']=[_s for _s in SPK['slide'] if _s.get('pesan') not in ('Alternatif peta dua tingkat','Daerah dengan probabilitas longsor','Mitigasi tiap kab/kota')]
_KT=lambda c:{'tanpa_kepala':True,'pita_kelompok':True,'pita_warna':'tint.basah.pita','pita_hitung':False,'tanpa_pita_kolom':True,'pita_tinggi_pt':16,'pita_subtotal':True,'peringkat':False,'baris_maks_pt':24,'data':{'csv':c,'keyakinan':'terverifikasi','sumber':SIS,'kolom':KOL_Q}}
_tq=dict(_KT('data/lap/p4a.csv')); _tq['judul_panel']=''
SPK['slide'].insert(2,{'jenis':'tabel-peringkat','jenis_slide':'tabel','seri':'banjir','judul_bentuk':'temuan','rasio':0.5,'pesan':'Rincian kab/kota Awas dan Siaga','cut_off':False,'logo_kampus':'foto/kris-header.png','sumber':SIS,'judul':f"Rincian {oranye(A('q.nk',len(_q4),'kab/kota',SIS))}"+chr(160)+'kab/kota dengan kecamatan berstatus Awas dan Siaga','tabel':_tq,'panel':_KT('data/lap/p4b.csv')})
_KJ=lambda c:{'tanpa_kepala':True,'pita_kelompok':True,'pita_hitung':False,'pita_tinggi_pt':16,'peringkat':False,'baris_maks_pt':26,'data':{'csv':c,'keyakinan':'estimasi-model','sumber':JLS,'kolom':[{'nama':'prov','kepala':'Provinsi'},{'nama':'kab','kepala':'Kab/Kota','bobot':1.6},{'nama':'asal','kepala':'Gudang','bobot':.8},{'nama':'moda','kepala':'Moda','bobot':.45},{'nama':'jam','kepala':'Waktu','bobot':.5},{'nama':'turun','kepala':'Turun di','bobot':1.35}]}}
_tj=dict(_KJ('data/lap/jla.csv')); _tj['judul_panel']=''
SPK['slide'].insert(5,{'jenis':'tabel-peringkat','jenis_slide':'tabel','seri':'jalur','judul_bentuk':'temuan','rasio':0.5,'pesan':'Rincian jalur per kab/kota','cut_off':False,'logo_kampus':'foto/kris-header.png','sumber':JLS,'judul':f"Rincian pengiriman logpal ke {oranye(jn)}"+chr(160)+'kab/kota: gudang asal, moda, waktu dan titik turun','tabel':_tj,'panel':_KJ('data/lap/jlb.csv')})
json.dump(NIL,open(PJ+'data/lap/banjir.json','w',encoding='utf-8'),ensure_ascii=False,indent=0); json.dump({'angka':ANG},open(PJ+'data/angka.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
for _n,_s in zip((1,2,2,3,3,3),SPK['slide'][:6]): _s['bagian']=_n
SPK['bagian']=[{'judul':j_,'label':l_,'halaman_tetap':h_} for j_,l_,h_ in (('Peta Banjir','Peta banjir',[1]),('Probabilitas Banjir','Probabilitas banjir',[2,3]),('Kebutuhan dan Jalur Logistik','Kebutuhan',[4,5,6]))]
json.dump(SPK,open(PJ+'spek/banjir-081126.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('spek ok')
