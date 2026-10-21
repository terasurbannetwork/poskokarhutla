"""Susun hasil audit metode platform (workflow audit-metode-platform, 21 Okt 2026) dari journal.jsonl.
Keluaran: mentah/<tahap>-<modul>.json dan HASIL.md. Aman dijalankan ulang selama/setelah workflow berjalan.
Pakai: python3 -I susun.py <journal.jsonl>"""
import json, os, sys
J = sys.argv[1]; D = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(D, 'mentah'), exist_ok=True)
lab, hasil = {}, {}
for l in open(J):
    o = json.loads(l)
    if o.get('type') == 'started': lab[o['key']] = o['label']
    if o.get('type') == 'result' and o.get('result') and o['key'] in lab: hasil[lab[o['key']]] = o['result']
for k, v in hasil.items():
    json.dump(v, open(os.path.join(D, 'mentah', k.replace(':', '-') + '.json'), 'w'), ensure_ascii=False, indent=1)
MOD = ['karhutla-titik-luas-status', 'karhutla-risiko-cuaca', 'karhutla-model-sebaran', 'banjir-rob-longsor', 'gempa-tsunami',
       'gunungapi', 'kekeringan', 'cuaca-ekstrem', 'udara-asap', 'lintas-bnpb-sosial']
V = {'layak': 'Layak', 'layak_catatan': 'Layak dengan catatan', 'tidak_layak': 'Tidak layak'}
sel = lambda s: ' '.join(str(s or '').split()).replace('|', '/')
out = ['# Audit metode Pantau Bencana untuk paparan Presiden (21 Okt 2026)', '',
       'Tiap modul ditelaah 3 tahap: telaah (inventaris + vonis), tantang (pendapat kedua yang memeriksa bukti),',
       'alternatif (riset metode yang lebih tepat). Vonis akhir = hasil tahap tantang bila sudah ada.', '',
       f'Status: telaah {sum(f"telaah:{m}" in hasil for m in MOD)}/10, tantang {sum(f"tantang:{m}" in hasil for m in MOD)}/10, '
       f'alternatif {sum(f"alternatif:{m}" in hasil for m in MOD)}/10. Belum diverifikasi rujukannya kecuali disebut.', '']
tot = {'layak': 0, 'layak_catatan': 0, 'tidak_layak': 0}
for m in MOD:
    t, c, a = hasil.get(f'telaah:{m}'), hasil.get(f'tantang:{m}'), hasil.get(f'alternatif:{m}')
    if not t: out += [f'## {m}', '', '_Belum selesai._', '']; continue
    akhir = {x['nama']: x for x in (c or {}).get('keputusan', [])}
    out += [f'## {m}', '', sel(t.get('ringkasan')), '']
    if c: out += ['**Catatan penelaah kedua:** ' + sel(c.get('catatan_umum')), '']
    out += ['| Metode | Vonis awal | Vonis akhir | Alasan | Risiko di depan Presiden | Perbaikan |', '|---|---|---|---|---|---|']
    for x in t['metode']:
        k = akhir.get(x['nama']); va = (k or {}).get('vonis_akhir') or x['vonis']; tot[va] += 1
        out.append(f"| {sel(x['nama'])} | {V[x['vonis']]} | {V[va] + ('' if k else ' (belum ditantang)')} | "
                   f"{sel((k or {}).get('alasan') or x['alasan'])} | {sel(x['risiko_presiden'])} | {sel(x['perbaikan'])} |")
    for x in (c or {}).get('metode_terlewat', []):
        tot[x['vonis']] += 1
        out.append(f"| {sel(x['nama'])} (temuan penelaah kedua) | - | {V[x['vonis']]} | {sel(x['alasan'])} | | |")
    if a:
        out += ['', '**Metode yang lebih tepat:**', '', '| Prioritas | Metode lama | Usulan | Praktik resmi Indonesia | Data | Upaya | Cara uji | Rujukan |', '|---|---|---|---|---|---|---|---|']
        for u in sorted(a.get('usulan', []), key=lambda u: u['prioritas']):
            out.append(f"| {u['prioritas']} | {sel(u['metode_lama'])} | {sel(u['alternatif'])} | {sel(u['praktik_resmi_indonesia'])} | "
                       f"{sel(u['data_dibutuhkan'])} | {u['upaya']} | {sel(u['cara_validasi'])} | {'<br>'.join(sel(r) for r in u['rujukan'])} |")
    out.append('')
out[5:5] = [f"Rekap vonis (sementara bila belum lengkap): {tot['layak']} layak, {tot['layak_catatan']} layak dengan catatan, {tot['tidak_layak']} tidak layak.", '']
open(os.path.join(D, 'HASIL.md'), 'w').write('\n'.join(out) + '\n')
print('hasil', sorted(hasil), tot)
