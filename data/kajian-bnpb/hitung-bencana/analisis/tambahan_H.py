"""Angka bantu Bab 8 (penyajian). Baca hasil/dibi_mentah_2024_2026.json, tulis hasil/tambahan_H.json."""
import json, datetime as dt, collections, pathlib
B = pathlib.Path(__file__).parent
d = json.load(open(B/'hasil/dibi_mentah_2024_2026.json', encoding='utf8'))['data']
def tgl(r): return dt.datetime.utcfromtimestamp(r['dt']/1000)+dt.timedelta(hours=7)
def terd(r): return (r['menderita'] or 0)+(r['luka_sakit'] or 0)+(r['mengungsi'] or 0)
def rumah(r): return (r['rumah_rusak_berat'] or 0)+(r['rumah_rusak_sedang'] or 0)+(r['rumah_rusak_ringan'] or 0)
out = {}
# per tahun Jan-Okt
t = collections.defaultdict(lambda: [0,0.0,0])
for r in d:
    x = tgl(r)
    if x.month <= 10:
        a = t[x.year]; a[0]+=1; a[1]+=r['jumlah_kejadian'] or 0; a[2]+=r['meninggal'] or 0
out['jan_okt'] = {str(k): {'baris':v[0],'sum_jumlah_kejadian':v[1],'meninggal':v[2]} for k,v in sorted(t.items())}
# 12 bulan per jenis
lo, hi = dt.datetime(2025,11,13), dt.datetime(2026,11,13)
w = [r for r in d if lo <= tgl(r) < hi]
out['n12'] = len(w)
j = collections.defaultdict(lambda: [0,0,0,0])
for r in w:
    a = j[r['jenis_bencana']]; a[0]+=1; a[1]+=r['meninggal'] or 0; a[2]+=terd(r); a[3]+=rumah(r)
out['jenis12'] = {k: {'baris':v[0],'meninggal':v[1],'terdampak':v[2],'rumah_rusak':v[3]} for k,v in sorted(j.items(), key=lambda z:-z[1][0])}
out['total12'] = {'meninggal':sum(r['meninggal'] or 0 for r in w),'terdampak':sum(terd(r) for r in w),'rumah':sum(rumah(r) for r in w)}
# konsentrasi
def kons(f):
    v = sorted((f(r) for r in w), reverse=True); T = sum(v); n = len(v); res = {}
    for p in (0.1,0.5,1,5,10,25,50):
        k = max(1, round(n*p/100)); res[str(p)] = round(100*sum(v[:k])/T,1)
    return res
out['kons'] = {'meninggal':kons(lambda r:r['meninggal'] or 0),'terdampak':kons(terd),'rumah':kons(rumah)}
json.dump(out, open(B/'hasil/tambahan_H.json','w',encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
