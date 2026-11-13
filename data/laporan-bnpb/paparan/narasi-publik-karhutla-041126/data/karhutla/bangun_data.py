"""Paket data deck Brief Narasi Publik Karhutla: CSV dari snapshot data Pantau Bencana (live 4 Nov 2026) + sumber resmi."""
import csv, json, datetime as D, sys
from pathlib import Path

AKAR = Path(sys.argv[1])
SB = AKAR / 'data/karhutla/sumber'
OUT = AKAR / 'data/karhutla'
J = lambda n: json.loads((SB / n).read_text())
SD = D.date(2026, 11, 3)              # hari terakhir lengkap
N = (SD - D.date(2026, 1, 1)).days + 1  # jumlah hari 1 Jan s.d. 2 Nov


def tulis(nama, kolom, baris):
    with open(OUT / nama, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(kolom)
        w.writerows(baris)


m = J('musim_harian.json')
kum = J('kumulatif.json')
nas = m['nasional']
ini = sum(nas['2026'][:N])

# 1. titik panas 1 Jan s.d. 2 Nov per tahun (semua satelit tersedia tiap tahun)
th = {y: sum(nas[y][:N]) for y in nas}
tulis('tahunan.csv', ['kunci'] + [f'y{y}' for y in nas], [['titik'] + [th[y] for y in nas]])
s15 = kum['setara_2015']
ring = {
    'titik_2026': ini, 'titik_2019': th['2019'], 'titik_2023': th['2023'], 'titik_2025': th['2025'],
    'kali_2019': round(ini / th['2019'], 1), 'kali_2023': round(ini / th['2023'], 1),
    'kali_rerata': round(ini / (sum(th[y] for y in nas if y != '2026') / 7), 1),
    'setara15_2026': s15['nasional']['ini'], 'setara15_2015': s15['nasional']['banding']['2015']['titik'],
    'setara15_persen': s15['nasional']['banding']['2015']['persen'],
}

b15 = s15['nasional']['banding']
tulis('setara.csv', ['kunci', 'y2015', 'y2019', 'y2023', 'y2026'],
      [['titik', b15['2015']['titik'], b15['2019']['titik'], b15['2023']['titik'], s15['nasional']['ini']]])
ring.update({'setara15_2019': b15['2019']['titik'], 'setara15_2023': b15['2023']['titik'],
             'kali_setara_2019': round(s15['nasional']['ini'] / b15['2019']['titik'], 1),
             'kali_setara_2023': round(s15['nasional']['ini'] / b15['2023']['titik'], 1)})

# 2. bulanan 2026 dan mingguan (7 hari berakhir 2 Nov)
a = nas['2026'][:N]
bln = {}
for i, v in enumerate(a):
    d = D.date(2026, 1, 1) + D.timedelta(i)
    bln[d.month] = bln.get(d.month, 0) + v
NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt']
tulis('bulanan.csv', ['kunci'] + NB, [['titik'] + [bln[i + 1] for i in range(10)]])
ming = []
for w in range(5, -1, -1):
    e = N - 1 - 7 * w
    d0, d1 = D.date(2026, 1, 1) + D.timedelta(e - 6), D.date(2026, 1, 1) + D.timedelta(e)
    B = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    lab = f'{d0.day} {B[d0.month-1]}–{d1.day} {B[d1.month-1]}'
    ming.append([lab, sum(a[e - 6:e + 1])])
def _lab(t):
    a_, b_ = t.split('–')
    return f"{a_.split()[0]}–{b_}" if a_.split()[1] == b_.split()[1] else t
ming = [[r[0].split('–')[1], r[1]] for r in ming]   # label = tanggal akhir pekan
print('pekan', [r[0] for r in ming])
tulis('mingguan.csv', ['pekan', 'titik'], ming)
puncak = max(ming, key=lambda r: r[1])
ring.update({'pekan_akhir': ming[-1][1], 'pekan_puncak': puncak[1],
             'pekan_turun_persen': round((ming[-1][1] - puncak[1]) / puncak[1] * 100, 1),
             'puncak_okt': bln[10], 'agu_okt': bln[8] + bln[9] + bln[10],
             'agu_okt_persen': round((bln[8] + bln[9] + bln[10]) / ini * 100, 1)})

# 3. provinsi
prov = []
for k, v in m['prov'].items():
    t = sum(v['2026'][:N])
    t19 = sum(v['2019'][:N]) if '2019' in v else 0
    nama = kum['prov'].get(k, {}).get('nama', k)
    prov.append([nama, t, round(t / ini * 100, 1), t19])
prov.sort(key=lambda r: -r[1])
tulis('provinsi.csv', ['provinsi', 'titik', 'porsi', 'titik_2019'], prov)
ring.update({'prov_n': sum(1 for r in prov if r[1] > 0),
             'top10_persen': round(sum(r[1] for r in prov[:10]) / ini * 100, 1),
             'kalteng_titik': prov[0][1], 'kalteng_persen': prov[0][2]})
kal = [r for r in prov if r[0].startswith('Kalimantan')]
ring['kalimantan_persen'] = round(sum(r[1] for r in kal) / ini * 100, 1)

# 4. gambut: titik di KHG 1 Jan s.d. 2 Nov
kh = J('khg_hari.json')['hari']
# berkas KHG lengkap terakhir (repo, versi 4) berhenti 24 Okt; penyebut hari yang sama
NK = (D.date(2026, 10, 24) - D.date(2026, 1, 1)).days + 1
khg = sum(sum(x.values()) for d, x in kh.items() if d <= '2026-10-24')
ring.update({'khg_titik': khg, 'khg_nasional': sum(nas['2026'][:NK]), 'khg_persen': round(khg / sum(nas['2026'][:NK]) * 100, 1)})

# 5. peta izin, 7 x 24 jam s.d. 12 Okt (puncak)
kk = J('kompleks_konsesi.json')
tot, kon = kk['total']['n'], kk['total']['konsesi']
jn = {x['jenis']: x['n'] for x in kk['jenis']}
LAB = {'hti': 'Hutan tanaman industri', 'sawit': 'Kebun sawit', 'hph': 'Hutan alam (HPH)'}
izin = [['Di luar peta izin', tot - kon, round((tot - kon) / tot * 100, 1)]]
for j in ('hti', 'sawit', 'hph'):
    izin.append([LAB[j], jn[j], round(jn[j] / tot * 100, 1)])
izin.append(['Tambang', jn['tambang'], round(jn['tambang'] / tot * 100, 1)])
tulis('izin.csv', ['lokasi', 'titik', 'porsi'], izin)
ring.update({'izin_total': tot, 'izin_dalam': kon, 'izin_dalam_persen': round(kon / tot * 100, 1),
             'izin_luar': tot - kon, 'izin_luar_persen': izin[0][2], 'izin_sawit': jn['sawit'],
             'izin_sawit_persen': izin[2][2], 'izin_hti': jn['hti']})

# 6. luas terbakar resmi (KLHK/Kemenhut SiPongi via infografis Bakom 15 Okt; 2026 SiPongi s.d. Jul)
fs = J('factsheet_karhutla.json')
lu = {r[0]: r[1] for r in fs['nasional'] if r[0].isdigit() and r[0] != '2026'}
lu['2025'] = J('luas.json')['angka'][1]['nilai']   # SiPongi setahun 2025 (359.619), menggantikan 343.432
lu['2026 Jan–Jul'] = J('luas.json')['angka'][0]['nilai']
ring['luas_bnpb_okt'] = [r[1] for r in J('factsheet_karhutla.json')['nasional'] if r[0] == '2026'][0]
pk0 = J('peta_karhutla.json'); lu['2026 prakiraan'] = sum(pk0['nasional']['luas'][:pk0['hari'].index(SD.isoformat()) + 1])
tulis('luas.csv', ['kunci'] + list(lu), [['ha'] + list(lu.values())])
ring.update({'luas_2015': lu['2015'], 'luas_2019': lu['2019'], 'luas_2023': lu['2023'],
             'luas_2025': lu['2025'], 'luas_2026_jul': lu['2026 Jan–Jul']})

# 7. personel per unsur (Bakom 15 Okt) dan operasi udara (rekap PDW s.d. 25 Okt)
pu = fs['personel_unsur']
pt = sum(n for _, n in pu)
NONPEM = {'Perusahaan', 'Relawan', 'Masyarakat Peduli Api'}
tulis('personel.csv', ['unsur', 'personel', 'porsi'], [[u, n, round(n / pt * 100, 1)] for u, n in pu])
ru = J('rekap_udara.json')['total']
wb = [r for r in ru if r['jenis'] == 'wb']
pa = [r for r in ru if r['jenis'] == 'patroli']
ring.update({'personel_total': pt, 'personel_nonpem': sum(n for u, n in pu if u in NONPEM),
             'personel_nonpem_persen': round(sum(n for u, n in pu if u in NONPEM) / pt * 100, 1),
             'personel_tni_polri': sum(n for u, n in pu if u in ('TNI', 'Polri')),
             'wb_sorti': sum(r['sortie'] for r in wb), 'wb_drop': sum(r['wb_drop'] for r in wb),
             'patroli_sorti': sum(r['sortie'] for r in pa), 'heli_kontrak': sum(r['kontrak'] for r in ru),
             'udara_prov': len({r['prov'] for r in ru})})
tulis('dunia.csv', ['negara', 'ha', 'sumber'],
      [[r['n'], r['ha'], r['src'] + (', perkiraan' if r.get('kira') else ', belum akhir musim' if r.get('per') else '')] for r in fs['dunia']])

pk = J('peta_karhutla.json')
ik = pk['hari'].index(SD.isoformat())
ring['biaya_per_ha_2015'] = round(16.1e9 / lu['2015'])
ring['luas_kita'] = sum(pk['nasional']['luas'][:ik + 1])
ring['kerugian_2026_miliar'] = round(16.1e9 / lu['2015'] * ring['luas_kita'] / 1e9, 1)
ring['personel_pemerintah'] = ring['personel_total'] - ring['personel_nonpem']
ak = J('aktor_karhutla.json')['perusahaan']
asing = [p for p in ak if any(n != 'ID' for n in p.get('negara', []))]
tk = lambda p: (p.get('cek') or {}).get('titik_terkini') or 0
ring.update({'aktor_total': len(ak), 'aktor_asing': len(asing), 'aktor_hotspot_asing': sum(map(tk, asing)),
             'aktor_hotspot_bernama': sum(map(tk, ak)), 'aktor_sg': sum('SG' in p['negara'] for p in asing),
             'aktor_my': sum('MY' in p['negara'] for p in asing)})
ring['aktor_hotspot_asing_persen'] = round(ring['aktor_hotspot_asing'] / ring['aktor_hotspot_bernama'] * 100, 1)
(OUT / 'ringkas.json').write_text(json.dumps(ring, ensure_ascii=False, indent=1))
print(json.dumps(ring, ensure_ascii=False, indent=1))
print(ming, prov[:12], izin, lu, sep='\n')
