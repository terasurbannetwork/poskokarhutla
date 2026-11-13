import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
import glob,json,importlib.util,subprocess,re,os
R='D:/Project/Work/BNPB/poskokarhutla/'
s=importlib.util.spec_from_file_location('dl',R+'scripts/data/dalops_banjir.py'); dl=importlib.util.module_from_spec(s); s.loader.exec_module(dl)
F=glob.glob(HOME + 'Desktop/Laporan Harian Dit. Koordalops BNPB *112026*.pdf')+glob.glob(HOME + 'Desktop/01 Kerja BNPB/Laporan Harian Dit. Koordalops BNPB *112026*.pdf')+glob.glob('I:/Other computers/Mac Saya/Downloads/Laporan Harian Dit. Koordalops BNPB *102026*.pdf')+glob.glob('D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LAPORAN HARIAN 2026/10 Oktober 2026/*.pdf')
T={}
dl.baca_pdf=lambda f: subprocess.run(['pdftotext','-enc','UTF-8','-layout',f,'-'],capture_output=True).stdout.decode('utf-8','replace')
for f in F:
    m=re.search(r'(\d\d)(\d\d)2026',os.path.basename(f)); T.setdefault(m[2]+m[1],f)
print(sorted(T))
K=['Pidie Jaya','Deli Serdang','Langkat','Serdang Bedagai','Lumajang','Aceh Barat','Aceh Selatan','Gayo Lues','Subulussalam','Binjai','Mandailing Natal','Padang Pariaman']
out={}
for d,f in sorted(T.items()):
    if d<'1020': continue
    try: e=dl.laphar_banjir(dl.baca_pdf(f))
    except Exception as x: print('gagal',d,x); continue
    for r in e:
        for k in K:
            if k.lower()==re.sub(r'^(kab\.?|kabupaten)\s*','',str(r.get('kab','')),flags=re.I).replace('Kota ','').strip().lower() or (k in ('Subulussalam','Binjai') and k.lower() in str(r.get('kab','')).lower()):
                out.setdefault(k,[]).append(dict(d=d,mulai=r.get('mulai'),kec=r.get('kecamatan'),desa=r.get('desa_teks')))
json.dump(out,open('lap2.json','w',encoding='utf-8'),ensure_ascii=False)
for k in K:
    print('##',k)
    for r in out.get(k,[]): print('  ',r['d'],r['mulai'],'|',str(r['kec'])[:150],'|',str(r['desa'])[:150])
