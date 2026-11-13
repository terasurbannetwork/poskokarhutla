import sys,os,glob,json,importlib.util
SP=os.getcwd(); R='D:/Project/Work/BNPB/poskokarhutla/'; G=R+'data/laporan-bnpb/generator'; sys.path.insert(0,G); os.chdir(G)
import wa_harian
s=importlib.util.spec_from_file_location('dalops',R+'scripts/data/dalops_banjir.py'); dl=importlib.util.module_from_spec(s); s.loader.exec_module(dl)
L={r['prov']+'|'+r['kab']:r for r in json.load(open(SP+'/lap.json',encoding='utf-8'))}; H={}
for f in sorted(glob.glob(R+'data/laporan-bnpb/harian/2026-11/2026-11-0[1-8]/wa-koordalops.txt')):
    h=os.path.basename(os.path.dirname(f))   # 13 Nov: folder hari = tanggal
    for x in wa_harian.koordalops(open(f,encoding='utf-8').read(),pagi=False)['kejadian']:
        k=f"{x['prov']}|{x['lokasi']}"
        if k in L and (x['jenis']=='banjir' or 'banjir' in (x.get('label') or '').lower()):
            kn=x.get('teks',{}).get('kondisi') or ''
            if dl.surut(kn) and 'mulai surut' not in kn.lower(): H.setdefault(k,h)
            print(h,k,'|',kn[:70])
out={k:(f"{int(H[k][8:])} Nov" if r['surut'] and k in H else '') for k,r in L.items()}
for k,r in L.items():
    if r['surut'] and not out[k]: out[k]=f"{int(r['hari_akhir'][8:])} Nov"
json.dump(out,open(SP+'/selesai.json','w',encoding='utf-8'),ensure_ascii=False); print(out)
