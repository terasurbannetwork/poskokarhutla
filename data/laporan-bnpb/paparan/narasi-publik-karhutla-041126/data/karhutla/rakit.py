import json, datetime as dt, collections
T = {y: json.load(open(f'fs_{y}.json')) for y in (2015, 2019, 2023, 2026)}
S = json.load(open('fs2_setara26.json')); A = json.load(open('fs2_semua26.json'))
KUM = {'2015': 865219, '2019': 404165, '2023': 236842, '2026': 659271}   # hotspot M+N kumulatif.json setara_2015
def jum(d, a, b, i=0): return sum(v[i] for k, v in d.items() if a <= k <= b)
def tahun(y, akhir='10-27'): return jum(T[y], f'{y}-01-01', f'{y}-{akhir}')
fs = {y: tahun(y) for y in (2015, 2019, 2023, 2026)}
fs3 = {y: jum(T[y], f'{y}-01-01', f'{y}-10-27', 1) for y in fs}
hsN = {y: jum(T[y], f'{y}-01-01', f'{y}-10-27', 2) for y in fs}
rasio = {f'2026/{y}': round(fs[2026] / fs[y], 2) for y in (2019, 2023, 2015)}
bulan = lambda d, y, i=0, n=10: [jum(d, f'{y}-{m:02d}-01', f'{y}-{m:02d}-31', i) for m in range(1, n + 1)]
def pekan(d, i=0):
    out = {}; a = dt.date(2026, 9, 8)
    for _ in range(8):
        b = a + dt.timedelta(days=6)
        out[f'{a}..{b}'] = jum(d, a.isoformat(), b.isoformat(), i); a += dt.timedelta(days=7)
    return out
pv = collections.Counter()
for k, v in A.items():
    pv.update(v[2])
out = {
 'definisi': 'Firespot dalam TITIK: lokasi unik ~375 m per hari WIB (TU.sel) yang berada di cluster ST-DBSCAN (harian.dbscan, jendela 7 hari berakhir hari itu, titik VIIRS keyakinan >= nominal, tanpa gunung api/sumber statis, di dalam wilayah Indonesia) yang lolos harian.firespot()=="ya" (pola HH/H/MH/MMM, AMBANG_MEDIUM_PX=4). Tanpa FWI/cuaca dan tanpa pembuangan cluster kecil level-0 (itu bergantung FWI).',
 'sensor': 'Seri tahunan: cluster dari VIIRS S-NPP saja (basis setara, MODIS tidak pernah membentuk cluster di mesin); MODIS hanya ikut di pembilang hotspot M+N. Seri semua-satelit 2026: S-NPP + NOAA-20 + NOAA-21, titik unik lintas satelit.',
 'periode': '1 Jan s.d. 27 Okt tiap tahun (2026 diperpanjang ke 2 Nov di blok terpisah)',
 'tahun': {str(y): fs[y] for y in fs},
 'tahun_tanpa_cluster_kecil_3titik': {str(y): fs3[y] for y in fs},
 'rasio': rasio,
 'porsi_firespot_per_hotspot': {'hotspot_M_N_kumulatif_json': {k: round(100 * fs[int(k)] / v, 1) for k, v in KUM.items()},
    'hotspot_hanya_SNPP_semua_keyakinan_sebasis': {str(y): round(100 * fs[y] / hsN[y], 1) for y in fs}, 'hotspot_SNPP': {str(y): hsN[y] for y in fs}, 'hotspot_M_N_kumulatif_json_angka': KUM},
 'setara_2026_sd_2_nov': {'firespot': jum(S, '2026-01-01', '2026-11-02'), 'hotspot_M_N': jum(S, '2026-01-01', '2026-11-02', 1)},
 'setara_per_bulan_Jan_Okt': {'2019': bulan(T[2019], 2019), '2026': bulan(S, 2026)},
 'setara_2026_pekan_puncak_6_12_Okt': jum(S, '2026-10-06', '2026-10-12'),
 'setara_2026_pekan_terakhir_27Okt_2Nov': jum(S, '2026-10-27', '2026-11-02'),
 'setara_2026_per_pekan_8_terakhir': pekan(S),
 'semua_satelit_2026': {'firespot_1Jan_2Nov': jum(A, '2026-01-01', '2026-11-02'), 'hotspot_semua_satelit_1Jan_2Nov': jum(A, '2026-01-01', '2026-11-02', 1),
    'per_bulan_Jan_Okt': bulan(A, 2026), 'per_pekan_8_terakhir': pekan(A), 'prov_10_teratas': pv.most_common(10)},
}
json.dump(out, open('firespot_tahunan.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
