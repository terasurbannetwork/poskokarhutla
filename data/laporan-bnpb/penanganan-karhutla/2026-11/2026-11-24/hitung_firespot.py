"""Firespot 24 Nov 2026 s.d. 18.00 WIB dihitung lokal (pemilik 24 Nov: "hitung firespot sendiri"): situs berhenti di build 13.35 WIB
(titik s.d. 11.14 WIB), FIRMS sudah s.d. 15.58 WIB (46% titik belum masuk situs). Cara sama dengan 13 dan 17 Nov: firespot_hari.hitung atas FIRMS
segar, FWI dikunci ke fwi.json situs (web/fwi.json)."""
import json, os, sys
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', '..', '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
import firespot_hari as F
hasil = F.hitung('2026-11-24', '18:00', F.cuaca_dari_fwi(os.path.join(S, 'web', 'fwi.json'), '2026-11-24'))
json.dump(hasil, open(os.path.join(S, 'firespot-2026-11-24.json'), 'w'))
print('firespot nasional', sum(r[F.KOL_FS] for r in hasil.values()))
for k in sorted(hasil, key=lambda k: -hasil[k][F.KOL_FS])[:10]: print(' ', k, hasil[k][F.KOL_FS])
