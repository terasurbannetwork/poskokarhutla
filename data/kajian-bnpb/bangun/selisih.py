#!/usr/bin/env python3
"""Pemeriksa konsistensi angka resmi (rekomendasi 100). Stdlib saja.

Entri angka.json boleh memuat "setara": [kunci lain yang mengukur besaran yang sama] dan
"toleransi" (persen, opsional; default 0). Skrip menggabungkan kunci yang saling menunjuk jadi
grup, membaca nilainya lewat Konteks.nilai (resolver yang sama dengan naskah.py), lalu menulis
data/selisih.json. Selisih adalah fakta yang dilaporkan, bukan galat: keluar 0 selama registri utuh.

Pakai: python3 selisih.py [--uji]
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]  # data/kajian-bnpb
sys.path.insert(0, str(AKAR / 'bangun' / 'kontrak'))


def grup_dari(angka):
    """Komponen terhubung dari relasi setara; kunci tak dikenal -> KeyError."""
    ada = {k for k, e in angka.items() if isinstance(e, dict) and e.get('setara')}
    for k in list(ada):
        for t in angka[k]['setara']:
            if t not in angka:
                raise KeyError(f'"{k}".setara menunjuk kunci yang tidak ada: {t}')
            ada.add(t)
    induk = {k: k for k in ada}

    def cari(x):
        while induk[x] != x:
            induk[x] = induk[induk[x]]
            x = induk[x]
        return x
    for k in ada:
        for t in angka[k].get('setara', []):
            induk[cari(k)] = cari(t)
    hasil = {}
    for k in sorted(ada):
        hasil.setdefault(cari(k), []).append(k)
    return sorted(hasil.values())


def bandingkan(kunci, angka, nilai_dari):
    """nilai_dari(kunci) -> (nilai, rendah, tinggi, entri). Satu dict grup."""
    es = [angka[k] for k in kunci]
    vs, ket = [], []
    for k in kunci:
        v, lo, hi, _ = nilai_dari(k)
        vs.append(v if v is not None else (lo if lo is not None else None))
    sumber = [e.get('pustaka') or e.get('berkas', '') for e in es]
    catatan = []
    ok = [v for v in vs if isinstance(v, (int, float))]
    if len(ok) < 2 or len(ok) != len(vs):
        return {'kunci': kunci, 'nilai': vs, 'sumber': sumber, 'selisih_persen': None,
                'status': 'selisih', 'catatan': 'ada nilai kosong atau bukan angka tunggal; tidak dibandingkan'}
    tol = max(float(e.get('toleransi', 0)) for e in es)
    if len({e.get('satuan', '') for e in es}) > 1:
        catatan.append('satuan berbeda: ' + ', '.join(sorted({e.get('satuan', '') for e in es})))
    lo, hi = min(ok), max(ok)
    sel = round((hi - lo) / abs(hi) * 100, 4) if hi else 0.0  # terhadap nilai terbesar
    status = 'cocok' if sel <= tol else 'selisih'
    for e in es:
        if e.get('catatan') and status == 'selisih':
            catatan.append(e['catatan'])
            break
    return {'kunci': kunci, 'nilai': vs, 'sumber': sumber, 'selisih_persen': sel,
            'status': status, 'catatan': '; '.join(catatan)}


def hitung(angka, nilai_dari):
    return [bandingkan(g, angka, nilai_dari) for g in grup_dari(angka)]


def _uji():
    ang = {
        'a': {'setara': ['b'], 'toleransi': 1, 'satuan': 'x'}, 'b': {'setara': ['a'], 'satuan': 'x'},
        'c': {'setara': ['d', 'e'], 'satuan': 'x', 'catatan': 'beda definisi'}, 'd': {'setara': ['c'], 'satuan': 'x'},
        'e': {'setara': ['c'], 'satuan': 'x'}, 'f': {'satuan': 'x'},
    }
    nil = {'a': 100, 'b': 100.5, 'c': 10, 'd': 10, 'e': 12}
    g = hitung(ang, lambda k: (nil[k], None, None, ang[k]))
    assert [x['kunci'] for x in g] == [['a', 'b'], ['c', 'd', 'e']], g
    assert g[0]['status'] == 'cocok' and g[0]['selisih_persen'] == round(0.5 / 100.5 * 100, 4)
    assert g[1]['status'] == 'selisih' and g[1]['selisih_persen'] == round(2 / 12 * 100, 4)
    assert 'beda definisi' in g[1]['catatan']
    try:
        grup_dari({'a': {'setara': ['zz']}})
        raise SystemExit('gagal: kunci tak dikenal lolos')
    except KeyError:
        pass
    print('selisih.py uji diri: OK')


def main():
    if '--uji' in sys.argv:
        return _uji()
    from naskah import Konteks
    k = Konteks()
    grup = hitung(k.angka, k.nilai)
    out = {'dibuat': datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'grup': grup}
    (AKAR / 'data' / 'selisih.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    for g in grup:
        print(f"{g['status']:7} {g['selisih_persen']}%  {g['nilai']}  {g['kunci'][0]} (+{len(g['kunci']) - 1})")
    print(f"{len(grup)} grup, {sum(g['status'] == 'selisih' for g in grup)} selisih")


if __name__ == '__main__':
    main()
