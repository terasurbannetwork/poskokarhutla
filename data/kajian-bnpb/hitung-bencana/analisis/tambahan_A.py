"""Angka tambahan kelompok A (identitas kejadian) dari tarikan DIBI 12 Nov 2026.
Sumber: hasil/dibi_mentah_2024_2026.json. Keluaran: hasil/tambahan_A.json.
Satuan: baris DIBI = hari x kabupaten x jenis. Semua tanggal dibaca dari 'dt' (ms epoch, UTC) tanpa koreksi zona.
"""
import json, collections, datetime as dt, os
B = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(B, 'hasil', 'dibi_mentah_2024_2026.json'), encoding='utf-8'))['data']
for r in d:
    r['t'] = dt.datetime.utcfromtimestamp(r['dt'] / 1000).date()
H = {}
# 1. jenis gabungan / turunan
c = collections.Counter(r['jenis_bencana'].strip() for r in d)
H['jenis_gabungan'] = {k: c[k] for k in ['Banjir', 'Banjir dan Tanah Longsor', 'Banjir Bandang', 'Tanah Longsor', 'Gempabumi', 'Gempa Bumi dan Tsunami', 'Tsunami', 'Banjir Rob', 'Banjir Genangan', 'Gerakan Tanah'] if k in c}
H['jenis_gabungan_total_baris'] = len(d)
# 2. lintas tahun: baris 31 Des dan 1 Jan pada kabupaten dan jenis sama
key = collections.defaultdict(set)
for r in d:
    key[(r['provinsi'], r['kabupaten'], r['jenis_bencana'].strip())].add(r['t'])
lt = collections.Counter(); contoh = []
for k, s in key.items():
    for t in s:
        if t.month == 12 and t.day == 31 and dt.date(t.year + 1, 1, 1) in s:
            lt[k[2]] += 1
            if len(contoh) < 3 and k[2] in ('Banjir', 'Kekeringan'): contoh.append([k[1], str(t)])
H['lintas_tahun_31des_1jan_sama_kab_jenis'] = {'total': sum(lt.values()), 'per_jenis': dict(lt.most_common(6)), 'contoh': contoh}
# 3. rangkaian hari berurutan pada kabupaten dan jenis sama, dan jeda antarrangkaian
def runs(s):
    s = sorted(s); out = []; a = b = s[0]
    for t in s[1:]:
        if (t - b).days == 1: b = t
        else: out.append((a, b)); a = b = t
    out.append((a, b)); return out
dur = collections.defaultdict(list); jeda = collections.defaultdict(list)
for k, s in key.items():
    if k[2] not in ('Banjir', 'Kekeringan', 'Kebakaran Hutan dan Lahan', 'Cuaca Ekstrem'): continue
    rr = runs(s)
    for a, b in rr: dur[k[2]].append((b - a).days + 1)
    for i in range(1, len(rr)): jeda[k[2]].append((rr[i][0] - rr[i - 1][1]).days - 1)
def q(v, p): v = sorted(v); return v[min(len(v) - 1, int(p * len(v)))]
H['rangkaian_hari_berurutan'] = {j: {'n_rangkaian': len(v), 'median_hari': q(v, .5), 'p90_hari': q(v, .9), 'maks_hari': max(v)} for j, v in dur.items()}
bj = jeda['Banjir']
H['banjir_jeda_antar_rangkaian_sama_kab'] = {'n_pasangan': len(bj), 'jeda_1_2_hari': sum(1 for x in bj if 1 <= x <= 2), 'jeda_1_7_hari': sum(1 for x in bj if 1 <= x <= 7), 'jeda_8_30_hari': sum(1 for x in bj if 8 <= x <= 30)}
kj = jeda['Kebakaran Hutan dan Lahan']
H['karhutla_jeda_antar_rangkaian_sama_kab'] = {'n_pasangan': len(kj), 'jeda_1_2_hari': sum(1 for x in kj if 1 <= x <= 2), 'jeda_1_7_hari': sum(1 for x in kj if 1 <= x <= 7), 'jeda_8_30_hari': sum(1 for x in kj if 8 <= x <= 30)}
# 4. pecahan: kejadian lintas kabupaten pada hari dan jenis sama dengan pecahan identik
g = collections.defaultdict(list)
for r in d:
    if 0 < r['jumlah_kejadian'] < 1: g[(r['t'], r['provinsi'], r['jenis_bencana'].strip(), round(r['jumlah_kejadian'], 3))].append(r['kabupaten'])
H['pecahan_kelompok_hari_jenis_provinsi_nilai_sama'] = {'kelompok': len(g), 'kelompok_dengan_kab_sebanyak_1_per_nilai': sum(1 for k, v in g.items() if abs(len(v) * k[3] - 1) < 0.02)}
json.dump(H, open(os.path.join(B, 'hasil', 'tambahan_A.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(H, ensure_ascii=False, indent=1))
