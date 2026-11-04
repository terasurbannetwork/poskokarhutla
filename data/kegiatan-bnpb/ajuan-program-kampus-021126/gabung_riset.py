"""Gabung riset-mentah/kampus-*.json jadi riset.json (format riset.py pohon), dikelompokkan per kampus."""
import json, glob, collections, sys, io, re
URUT = ['USK','Unand','IPB','UI','ITB','Tel-U','UGM','ITS','Unram','ULM','Unhas','Unpatti']
klaim = collections.defaultdict(list); profil = {}
for f in sorted(glob.glob('riset-mentah/kampus-*.json')):
    d = json.load(open(f, encoding='utf8'))
    profil.update(d.get('kampus', {}))
    for k in d['klaim']:
        s = k.get('subjek', '')
        kunci = next((u for u in URUT if u.lower().replace('-', '') in s.lower().replace('-', '').replace('telkom university', 'telu')), s)
        k = dict(k)
        t = (k.get('tanggal') or '').strip()
        if re.fullmatch(r'\d{4}(-\d{2})?', t):
            k['tanggal'] = (t + '-01-01')[:10] if len(t) == 4 else t + '-01'
            k['teks'] = k['teks'] + ' (tanggal perkiraan: ' + t + ')'
        if k.get('status') == 'risiko':
            k['kategori'] = 'risiko'
            k['status'] = 'temuan' if k.get('url') and k.get('lembaga') and k.get('tanggal') else 'inferensi'
        if k['status'] == 'temuan' and not (k.get('url') and k.get('lembaga') and k.get('tanggal')):
            k['status'] = 'inferensi'
        klaim[kunci].append(k)
sub = []
lain = [k for u in sorted(set(klaim) - set(URUT)) for k in klaim[u]]
klaim = {u: klaim[u] for u in URUT if u in klaim}
klaim['Mitra swasta dan kampus sekitar'] = lain
for i, u in enumerate(klaim, 1):
    sub.append({'id': f'K{i}', 'pertanyaan': f'{u}: aset kebencanaan, rekam tanggap, mitra swasta yang sudah ada, dan risiko', 'pencari': 1,
                'sub': [{'id': f'K{i}.1', 'pertanyaan': f'Bukti {u}', 'klaim': klaim[u]}]})
out = {'proyek': 'Ajuan program kerja sama BNPB, perguruan tinggi, dan swasta: analisis berangkat dari kampus',
       'jenis_deck': 'kerja-sama',
       'pertanyaan': 'Apa kekuatan nyata tiap kampus koordinator, dan program bersama swasta apa yang paling layak diturunkan dari kekuatan itu?',
       'tanggal': '2026-11-02', 'rujukan_lain': '../ajuan-program-pt-swasta-021126/riset.json (riset sesi ide-dulu; diacu, tidak disalin)',
       'profil_kampus': profil, 'sub': sub}
json.dump(out, open('riset.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for s in sub: print(s['pertanyaan'].split(':')[0], len(s['sub'][0]['klaim']))
