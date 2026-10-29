"""Uji bahan WA nyata (tests/wa/bahan): python3 uji_wa_bahan.py  (stdlib saja, Python 3.9+)."""
import glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wa_operasi, wa_harian

B = os.path.join(wa_operasi.AKAR, 'tests', 'wa', 'bahan')
for f in sorted(glob.glob(os.path.join(B, 'bmkg_*.txt'))):
    t = open(f, encoding='utf-8').read()
    asli = max(float(m.group(1).rstrip('.').replace(',', '.')) for m in
               re.finditer(r'^[\s*\-•]*[A-Za-z][A-Za-z0-9 .]+?(?::\s*|\s+)([\d.,]+)\s*(?:µg/m³)?\s*\([^)]+\)', t, re.M))
    o = wa_operasi.bmkg(t)
    assert len(o['pm']) >= 4 and o['periode'], (f, o)
    assert max(v for v, _, _ in o['pm'].values()) == asli, (f, asli, o['pm'])
    h = wa_harian.bmkg(t)
    n = len(h['pm']) if isinstance(h.get('pm'), (list, dict)) else 0
    assert n >= 8 and h.get('periode'), (f, h)
    print('ok', os.path.basename(f), 'maks', asli, 'operasi', len(o['pm']), 'prov, harian', n)
op = wa_operasi.operasi(open(os.path.join(B, 'satgas_271026.txt'), encoding='utf-8').read())
assert op['personel'] and op['armada'], op
k = wa_harian.koordalops(open(os.path.join(B, 'koordalops_261026_24.txt'), encoding='utf-8').read())
assert len(k['kejadian']) == 17, len(k['kejadian'])
print('koordalops 17 kejadian, satgas ok')
