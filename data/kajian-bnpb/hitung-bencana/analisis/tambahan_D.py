"""Angka tambahan Lampiran A kelompok D (kerugian dan uang): P-28, P-29, P-30, P-31.
Masukan: data/kajian-bnpb/data/dibi/kejadian_besar.csv (29 kejadian besar, beberapa versi angka per metrik),
         hasil/dibi_mentah_2024_2026.json (cek ada tidaknya kolom rupiah), hasil/banding_sumber_2026.json.
Keluaran: hasil/tambahan_D.json. Jalankan: python tambahan_D.py"""
import csv, json, os, collections
AK = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AK, '..', '..', '..', '..'))
H = {}
raw = json.load(open(os.path.join(AK, 'hasil/dibi_mentah_2024_2026.json'), encoding='utf8'))
H['p28_kolom_dibi_ada_rupiah'] = [k for k in raw['kolom'] if any(x in k.lower() for x in ('rp', 'rupiah', 'kerugian', 'nilai', 'biaya'))]
H['p28_jumlah_kolom_dibi'] = len(raw['kolom'])
rows = list(csv.DictReader(open(os.path.join(REPO, 'data/kajian-bnpb/data/dibi/kejadian_besar.csv'), encoding='utf8')))
g = collections.defaultdict(list)
for r in rows:
    if r['metrik'] in ('meninggal', 'hilang', 'mengungsi', 'rumah_rusak', 'kerugian_usd', 'luas_ha'):
        try: g[(r['kode'], r['metrik'])].append((r['versi'], float(r['nilai'])))
        except ValueError: pass
sp = []
for (k, m), v in g.items():
    if len(v) >= 2:
        nil = [x[1] for x in v]
        if min(nil) > 0:
            sp.append({'kejadian': k, 'metrik': m, 'versi': len(v), 'min': min(nil), 'maks': max(nil), 'rasio': round(max(nil) / min(nil), 2)})
sp.sort(key=lambda x: -x['rasio'])
H['p31_selisih_antarversi'] = sp
for m in ('meninggal', 'mengungsi', 'rumah_rusak'):
    r = [x['rasio'] for x in sp if x['metrik'] == m]
    r.sort()
    H[f'p31_ringkas_{m}'] = {'n_pasangan': len(r), 'median_rasio': r[len(r) // 2] if r else None, 'rasio_ge_1.5': sum(1 for x in r if x >= 1.5), 'rasio_sama_1.0': sum(1 for x in r if x == 1.0)}
H['p31_n_kejadian_di_berkas'] = len(set(r['kode'] for r in rows))
b = json.load(open(os.path.join(AK, 'hasil/banding_sumber_2026.json'), encoding='utf8'))
tot = {'DIBI baris': b['dibi_mentah_tarikan_baru']['baris'], 'DIBI jumlah_kejadian': b['dibi_mentah_tarikan_baru']['sum_jumlah_kejadian'],
       'Logbook DOCX V1g': b['logbook_2026_json_docx']['kejadian_tgl_Jan_Okt'], 'Logbook CSV': b['logbook_csv']['baris_tgl_kejadian_Jan_Okt'],
       'Logbook Koordalops': b['logbook_kejadian_json_koordalops']['mulai_atau_terlihat_pertama_Jan_Okt']}
H['p31_total_2026_antarsumber'] = tot
H['p31_rasio_maks_per_min_total'] = round(max(tot.values()) / min(tot.values()), 2)
per = {'karhutla': (b['dibi_per_jenis']['karhutla'], b['logbook_2026_json_docx']['per_jenis']['karhutla'], b['logbook_csv']['per_jenis']['karhutla'], b['logbook_kejadian_json_koordalops']['per_jenis']['karhutla']),
       'banjir': (b['dibi_per_jenis']['banjir'], b['logbook_2026_json_docx']['per_jenis']['banjir'], b['logbook_csv']['per_jenis']['banjir'], b['logbook_kejadian_json_koordalops']['per_jenis']['banjir']),
       'cuaca': (b['dibi_per_jenis']['cuaca ekstrem/angin'], b['logbook_2026_json_docx']['per_jenis']['cuaca'], b['logbook_csv']['per_jenis']['cuaca'], b['logbook_kejadian_json_koordalops']['per_jenis']['cuaca']),
       'kekeringan': (b['dibi_per_jenis']['kekeringan'], b['logbook_2026_json_docx']['per_jenis']['kekeringan'], b['logbook_csv']['per_jenis']['kekeringan'], b['logbook_kejadian_json_koordalops']['per_jenis']['kekeringan'])}
H['p31_per_jenis_urutan_DIBI_DOCX_CSV_Koordalops'] = {k: {'nilai': v, 'rasio_maks_min': round(max(v) / min(v), 2)} for k, v in per.items()}
json.dump(H, open(os.path.join(AK, 'hasil/tambahan_D.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(H, ensure_ascii=False, indent=1))
