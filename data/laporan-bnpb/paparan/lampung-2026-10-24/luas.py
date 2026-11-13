"""luas/belum/padam per hari WIB untuk subset titik deteksi (rumus peta_karhutla.py: porsi x 4,3 ha, belum 12-36 jam sel 3x3, padam 48 jam)."""
import json, datetime as dt
from collections import defaultdict
G, PORSI, HA = 0.003375, 0.5337924177818518, 4.3
def hitung(det, hari, saring=lambda p: True):
    T0 = dt.datetime(2026, 10, 1)
    pts = [((round(p['lon'] / G), round(p['lat'] / G)), (dt.datetime.strptime(p['w'], '%Y-%m-%d %H:%M') - T0).total_seconds() / 60, p['w'][:10], saring(p)) for p in det]
    sel = defaultdict(list)
    for c, t, d, _ in pts: sel[c].append(t)
    NB = [(a, b) for a in (-1, 0, 1) for b in (-1, 0, 1)]
    ada = lambda c, f: any(f(x) for o in NB for x in sel.get((c[0] + o[0], c[1] + o[1]), ()))
    out = {}
    for d in hari:
        D = dt.date.fromisoformat(d); d1, d2 = str(D - dt.timedelta(1)), str(D - dt.timedelta(2))
        L = [(c, t) for c, t, dd, s in pts if dd == d and s]; Lp = [(c, t) for c, t, dd, s in pts if dd == d2 and s]
        dua = {c for c, t, dd, s in pts if dd in (d1, d)}
        luas = len(L) * PORSI * HA; luas_p = len(Lp) * PORSI * HA
        belum = luas * (sum(1 for c, t in L if ada(c, lambda x: t - 2160 <= x <= t - 720)) / len(L) if L else 0)
        padam = luas_p * (sum(1 for c, t in Lp if not any((c[0] + o[0], c[1] + o[1]) in dua for o in NB)) / len(Lp) if Lp else 0)
        out[d] = [luas, belum, padam]
    return out
if __name__ == '__main__':
    det = json.load(open('titik.json'))['det']; P = json.load(open('../h24/web/peta_karhutla.json')); h = P['hari']
    H = ['2026-10-%d' % i for i in range(16, 24)]; r = hitung(det, H)
    for d in H: print(d, [round(v) for v in r[d]], [round(P['prov']['18'][m][h.index(d)] or 0) for m in ('luas', 'belum', 'padam')])
