import re, json, sys
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction
SP = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
A = json.load(open(SP + '/angka.json'))
P = A['prov']
def bul(v): return int(Decimal(v).quantize(Decimal(1), rounding=ROUND_HALF_UP))
def f0(n): return f"{n:,}".replace(',', '.')
def pct(cur, prev):
    fr = Fraction(cur - prev, prev) * 100
    up = int((fr + Fraction(1, 2)).__floor__())          # half toward +inf
    away = int((abs(fr) + Fraction(1, 2)).__floor__()) * (1 if fr >= 0 else -1)
    tie = (fr * 2).denominator == 1 and fr.denominator != 1
    return up, away, tie, float(fr)
LX = {'hot': [4663440, 5372913, 6082386], 'luas': [6974738, 7684211, 8393684], 'belum': [9286037, 9995510, 10704982]}
BX = {'hot': [4914907, 5624380, 6333853], 'luas': [7226206, 7935678, 8645151], 'belum': [9537504, 10246977, 10956450]}
def shapes(fn):
    s = open(fn).read(); out = []
    for m in re.finditer(r'<p:sp>.*?</p:sp>', s, re.S):
        b = m.group(0)
        o = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', b)
        if not o: continue
        x, y, cx, cy = map(int, o.groups())
        t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))
        f = re.search(r'<p:spPr>.*?<a:solidFill><a:srgbClr val="(\w+)"', b, re.S)
        tc = set(re.findall(r'<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val="(\w+)"', b))
        out.append(dict(x=x, y=y, cx=cx, cy=cy, t=t, fill=f.group(1) if f else None, tc=tc, xml=b))
    return s, out
bad = []; ok = 0
def chk(cond, msg):
    global ok
    if cond: ok += 1
    else: bad.append(msg)
def rows(fn, bases, codes, H, tag):
    s, S = shapes(fn)
    for base, k in zip(bases, codes):
        band = [z for z in S if base - H - 260000 < z['y'] < base + 200000 and z['x'] >= 4600000]
        for grp in ('hot', 'luas', 'belum'):
            v = P[k][grp]; disp = [bul(x) for x in v]
            mx = max(v[1:4])
            for i in range(3):
                lab = [z for z in band if z['x'] == LX[grp][i] and z['cy'] == 164592]
                arr = [z for z in band if z['x'] == LX[grp][i] and z['cy'] == 137160]
                bar = [z for z in band if z['x'] == BX[grp][i] and z['cx'] == 297979]
                where = f'{tag} prov {k} {grp} col{i} (Okt {18+i})'
                chk(len(lab) == 1 and lab[0]['t'] == f0(disp[i + 1]), f'{where}: label {[z["t"] for z in lab]} expected {f0(disp[i+1])} (raw {v[i+1]})')
                cur, prev = disp[i + 1], disp[i]
                up, away, tie, raw = pct(cur, prev)
                if tie: bad.append(f'{where}: arrow tie at {raw}% (half-up={up}, away={away})')
                p = up
                exp = (f'▲{f0(p)}%', 'D9600B') if p > 0 else (f'▼{f0(-p)}%', '2F86D1') if p < 0 else ('0%', None)
                chk(len(arr) == 1 and arr[0]['t'] == exp[0] and arr[0]['y'] == base + 18288, f'{where}: arrow {[(z["t"], z["y"]) for z in arr]} expected {exp[0]} at {base+18288} ({prev}->{cur}, {raw:.3f}%)')
                if arr:
                    col = list(arr[0]['tc'])
                    if exp[1]: chk(col == [exp[1]], f'{where}: arrow colour {col} expected {exp[1]}')
                    else: chk(len(col) == 1 and col[0] in ('6B7280', 'A9B4C2', '9CA3AF'), f'{where}: zero arrow colour {col} not grey')
                bc = exp[1] or 'A9B4C2'
                hexp = max(18288, round(H * v[i + 1] / mx))
                chk(len(bar) == 1 and bar[0]['fill'] == bc and bar[0]['y'] + bar[0]['cy'] == base, f'{where}: bar {[(z["fill"], z["y"], z["cy"]) for z in bar]} expected fill {bc} bottom {base}')
                if bar: chk(abs(bar[0]['cy'] - hexp) <= 1, f'{where}: bar height {bar[0]["cy"]} expected {hexp}')
                if bar and lab: chk(lab[0]['y'] + lab[0]['cy'] <= bar[0]['y'], f'{where}: label overlaps bar')
        # no extra shapes with text in band
        known = {(LX[g][i], c) for g in LX for i in range(3) for c in (164592, 137160)}
        extra = [(z['x'], z['y'], z['t']) for z in band if z['t'] and (z['x'], z['cy']) not in known and z['x'] >= 4600000 and z['cy'] in (164592, 137160, 182880)]
        chk(not extra, f'{tag} prov {k}: extra text shapes in band {extra}')
        nb = [z for z in band if z['cx'] == 297979]; nl = [z for z in band if z['cy'] == 164592 and z['cx'] == 800913]; na = [z for z in band if z['cy'] == 137160 and z['cx'] == 800913]
        chk(len(nb) == 9 and len(nl) == 9 and len(na) == 9, f'{tag} prov {k}: counts bars {len(nb)} labels {len(nl)} arrows {len(na)}')
    return s, S
def totals(S, y, codes, tag):
    for grp in ('hot', 'luas', 'belum'):
        for i in range(3):
            tot = sum(bul(P[k][grp][i + 1]) for k in codes)
            z = [q for q in S if q['x'] == LX[grp][i] and q['y'] == y and q['cy'] == 384048]
            chk(len(z) == 1 and z[0]['t'] == f0(tot), f'{tag} total {grp} col{i}: {[q["t"] for q in z]} expected {f0(tot)}')
P5 = ['62', '16', '63', '15', '61']; P3 = ['93', '72', '64']; P8 = P5 + P3
d = SP + '/verif3/x/ppt/slides/'
s1, S1 = rows(d + 'slide1.xml', [2587752, 3209544, 3831336, 4453128, 5074920], P5, 201168, 'S1')
s2, S2 = rows(d + 'slide2.xml', [2697480, 3429000, 4160520], P3, 310896, 'S2')
totals(S1, 5330952, P5, 'S1 5prov'); totals(S2, 4416552, P3, 'S2 3prov'); totals(S2, 4855464, P8, 'S2 8prov')
# FS pills
for i, x in enumerate([4762144, 5471617, 6181090]):
    fs = sum(P[k]['fs'][i + 1] for k in P8)
    z = [q for q in S2 if q['x'] == x and q['t'].endswith('FS')]
    chk(len(z) == 1 and z[0]['t'] == f'{f0(fs)} FS', f'S2 FS pill {i}: {[q["t"] for q in z]} expected {fs} FS')
# subtitles
Pd = sum(bul(P[k]['padam'][3]) for k in P5); T = sum(bul(P[k]['luas'][2]) for k in P5)
Q = int((Fraction(Pd * 100, T) + Fraction(1, 2)).__floor__()); B = sum(bul(P[k]['belum'][3]) for k in P5); X = sum(bul(P[k]['belum'][3]) for k in P8)
sub1 = [z['t'] for z in S1 if z['y'] == 905256][0]; sub2 = [z['t'] for z in S2 if z['y'] == 905256][0]
exp1 = f'±{f0(Pd)} ha ({Q} persen) dari ±{f0(T)} ha api 19 Okt telah padam pada 20 Okt, belum padam ±{f0(B)} ha'
chk(sub1.endswith(exp1), f'S1 subtitle {sub1!r} does not end with {exp1!r}')
chk(sub2.endswith(f'±{f0(X)} ha'), f'S2 subtitle {sub2!r} expected X={f0(X)}')
print('P', Pd, 'T', T, 'Q', Q, float(Fraction(Pd * 100, T)), 'B', B, 'X', X)
print('padam20 per prov', {k: (P[k]['padam'][3], bul(P[k]['padam'][3])) for k in P5})
# leftover template values
for tag, s in (('S1', s1), ('S2', s2)):
    texts = re.findall(r'<a:t>([^<]*)</a:t>', s)
    left = [t for t in texts if re.search(r'\d,\d', t) or t.strip() in ('NA', 'N/A') or 'TARGET' in t or 'belum termasuk' in t or 'NA:' in t]
    chk(not left, f'{tag} leftover template-like texts {left}')
print('OK checks', ok); print('FAIL', len(bad)); [print(' -', b) for b in bad]
