"""Rekap kejadian banjir dari WA Koordalops 1-8 Nov: kondisi terakhir per kab/kota."""
import sys,os,glob,re,json,importlib.util
R='D:/Project/Work/BNPB/poskokarhutla/'
G=R+'data/laporan-bnpb/generator'; sys.path.insert(0,G); os.chdir(G)
import wa_harian
s=importlib.util.spec_from_file_location('dalops',R+'scripts/data/dalops_banjir.py'); dl=importlib.util.module_from_spec(s); s.loader.exec_module(dl)
num=lambda t:int(t.replace('.','').replace(',',''))
def cari(t,pola):
    m=re.search(pola,t or '',re.I); return num(m[1]) if m else None
J={}
for f in sorted(glob.glob(R+'data/laporan-bnpb/harian-2026-11-0[1-8]/wa-koordalops.txt')):
    h=f.split('harian-')[1][:10]
    w=wa_harian.koordalops(open(f,encoding='utf-8').read(),pagi=False)
    for x in w['kejadian']:
        lab=(x.get('label') or '').lower()
        if x['jenis']!='banjir' and 'banjir' not in lab: continue
        if not x['lokasi']: print('tanpa lokasi',h,x['prov'],lab); continue
        k=(x['prov'],x['lokasi']); t=x.get('teks',{}); a=x.get('angka',{})
        o=J.setdefault(k,{'prov':x['prov'],'kab':x['lokasi'],'hari':[],'kk':None,'jiwa':None,'ungsi':None,'kondisi':'','hari_akhir':None})
        o['hari'].append(h); o['hari_akhir']=h; o['kondisi']=t.get('kondisi') or o['kondisi']; o['label']=lab
        dp=t.get('dampak') or ''
        kk=a.get('kk') or cari(dp,r'([\d.,]+)\s*KK'); jw=a.get('jiwa') or cari(dp,r'([\d.,]+)\s*jiwa')
        if kk: o['kk']=int(kk)
        if jw: o['jiwa']=int(jw)
        pg=t.get('pengungsi') or ''
        u=a.get('mengungsi') or cari(pg,r'([\d.,]+)\s*jiwa')
        if u: o['ungsi']=int(u)
        u2=cari(t.get('kondisi') or '',r'([\d.,]+)\s*jiwa\s*mengungsi')
        if u2 and not o['ungsi']: o['ungsi']=u2
rows=[]
for k,o in sorted(J.items()):
    o['surut']=bool(dl.surut(o['kondisi'])) and 'mulai surut' not in o['kondisi'].lower()
    if o['kab']=='Solok': continue   # laporan 4 Nov hanya koordinasi rehabilitasi, tanpa dampak banjir baru
    rows.append(o)
    print(o['prov'],o['kab'],'|',o['hari'][0],'->',o['hari_akhir'],'| KK',o['kk'],'jiwa',o['jiwa'],'ungsi',o['ungsi'],'| surut' if o['surut'] else '| BELUM','|',o['kondisi'][:90],'|',o.get('label'))
json.dump(rows,open(sys.argv[1],'w',encoding='utf-8'),ensure_ascii=False)
print(len(rows))
