import sys, json, re, xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
SP = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
X = SP + '/verif/x/ppt/slides/'
A = json.load(open(SP + '/angka.json'))['prov']
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
LX = {'hot': [4663440, 5372913, 6082386], 'luas': [6974738, 7684211, 8393684], 'belum': [9286037, 9995510, 10704982]}
P5 = ['62', '16', '63', '15', '61']; P3 = ['93', '72', '64']
ROWS = {1: (dict(zip([2587752, 3209544, 3831336, 4453128, 5074920], P5)), 201168),
        2: (dict(zip([2697480, 3429000, 4160520], P3)), 310896)}
NAIK, TURUN, ABU = 'D9600B', '2F86D1', 'A9B4C2'
errs = []; nchk = [0]
def ok(cond, msg):
    nchk[0] += 1
    if not cond: errs.append(msg)
def hu(v): return int(Decimal(str(v)).quantize(Decimal('1'), ROUND_HALF_UP))
def fmt(n): return f"{n:,}".replace(',', '.')
def shapes(fn):
    root = ET.parse(X + fn).getroot(); out = []
    for sp in root.iter('{%s}sp' % NS['p']):
        off = sp.find('.//a:xfrm/a:off', NS); ext = sp.find('.//a:xfrm/a:ext', NS)
        if off is None: continue
        g = tuple(int(v) for v in (off.get('x'), off.get('y'), ext.get('cx'), ext.get('cy')))
        fill = None; sf = sp.find('p:spPr/a:solidFill', NS)
        if sf is not None: fill = sf[0].get('val')
        tcs = set()
        for rp in sp.iter('{%s}rPr' % NS['a']):
            s = rp.find('a:solidFill', NS)
            if s is not None: tcs.add(s[0].get('val'))
        txt = ''.join(t.text or '' for t in sp.iter('{%s}t' % NS['a']))
        out.append(dict(g=g, fill=fill, tc=tcs, t=txt))
    return out
def num(t): return int(t.replace('.', ''))
disp = {}  # (k,grp,i) -> displayed int
for sl, fn in ((1, 'slide1.xml'), (2, 'slide2.xml')):
    S = shapes(fn); rows, H = ROWS[sl]
    for base, k in rows.items():
        for grp, xs in LX.items():
            v = A[k][grp]; tri = v[1:4]; mx = max(tri)
            for i, x in enumerate(xs):
                lab = [s for s in S if s['g'][0] == x and s['g'][3] == 164592 and base - H - 200000 < s["g"][1] < base]
                arr = [s for s in S if s['g'][0] == x and s['g'][3] == 137160 and s['g'][1] == base + 18288]
                bar = [s for s in S if abs(s["g"][0] - x - 251467) <= 1 and s['g'][2] == 297979 and s['g'][1] + s['g'][3] == base]
                tag = f"s{sl} {k} {grp} {['18','19','20'][i]}Okt"
                ok(len(lab) == 1 and len(arr) == 1 and len(bar) == 1, f"{tag}: shapes lab={len(lab)} arr={len(arr)} bar={len(bar)}")
                if not (lab and arr and bar): continue
                lab, arr, bar = lab[0], arr[0], bar[0]
                d = num(lab['t']); disp[(k, grp, i)] = d
                ok(d == round(tri[i]), f"{tag}: label {lab['t']} vs py-round {round(tri[i])} (raw {tri[i]})")
                if hu(tri[i]) != round(tri[i]): print(f"  NOTE {tag}: half-up {hu(tri[i])} != banker {round(tri[i])} for {tri[i]}")
                ok(lab['t'] == fmt(d), f"{tag}: format {lab['t']}")
                # label sits right above bar
                ok(lab['g'][1] == bar['g'][1] - 173736, f"{tag}: label y offset")
                # arrow
                cur, prev = tri[i], v[i]
                if prev == 0:
                    exp_t, exp_c = '', ABU
                else:
                    p = round((cur - prev) / prev * 100)
                    exp_t = f"▲{p}%" if p > 0 else (f"▼{-p}%" if p < 0 else '0%')
                    exp_c = NAIK if p > 0 else (TURUN if p < 0 else ABU)
                    # also with displayed (rounded) values
                    pd = round((round(cur) - round(prev)) / round(prev) * 100) if round(prev) else None
                    if pd is not None and pd != p: print(f"  NOTE {tag}: arrow raw {p}% vs from rounded values {pd}%")
                    praw = (cur - prev) / prev * 100
                    if abs(praw - round(praw) - 0.5) < 0.01 or abs(praw - round(praw) + 0.5) < 0.01: print(f"  NOTE {tag}: pct near .5: {praw:.4f}")
                ok(arr['t'] == exp_t.replace(',', '.'), f"{tag}: arrow '{arr['t']}' vs exp '{exp_t}' (cur {cur}, prev {prev})")
                arrc = (arr['tc'] or {None}).pop() if arr['tc'] else None
                if exp_t: ok(arrc == exp_c, f"{tag}: arrow colour {arrc} vs {exp_c}")
                ok(bar['fill'] == exp_c, f"{tag}: bar colour {bar['fill']} vs {exp_c}")
                ok(bar['fill'] == (arrc if exp_t and arrc != '6B7280' else bar['fill']), f"{tag}: bar/arrow colour mismatch {bar['fill']} {arrc}")
                # bar height proportional to row max
                hexp = max(18288, round(H * tri[i] / mx)); hdisp = round(H * d / max(round(t) for t in tri))
                ok(abs(bar['g'][3] - hexp) <= 1, f"{tag}: bar h {bar['g'][3]} vs exp {hexp}")
                if abs(bar['g'][3] - hdisp) > 2: print(f"  NOTE {tag}: bar h {bar['g'][3]} vs from displayed {hdisp}")
                if bar['g'][3] == 18288: print(f"  NOTE {tag}: bar clamped to min")
    # totals rows
    def totrow(y):
        r = {}
        for grp, xs in LX.items():
            for i, x in enumerate(xs):
                m = [s for s in S if s['g'][0] == x and s['g'][1] == y and s['g'][3] == 384048]
                ok(len(m) == 1, f"s{sl} total y={y} {grp} {i}: {len(m)} shapes"); r[(grp, i)] = num(m[0]['t']) if m else None
                ok(m and m[0]['t'] == fmt(num(m[0]['t'])), f"s{sl} total fmt {m[0]['t'] if m else ''}")
        return r
    if sl == 1:
        T5 = totrow(5330952)
        for (grp, i), v in T5.items():
            ok(v == sum(disp[(k, grp, i)] for k in P5), f"s1 total {grp} {i}: {v} vs {sum(disp[(k, grp, i)] for k in P5)}")
    else:
        T3 = totrow(4416552); T8 = totrow(4855464)
        for (grp, i), v in T3.items():
            ok(v == sum(disp[(k, grp, i)] for k in P3), f"s2 3prov {grp} {i}: {v} vs {sum(disp[(k, grp, i)] for k in P3)}")
            ok(T8[(grp, i)] == T5[(grp, i)] + v, f"s2 8prov {grp} {i}: {T8[(grp, i)]} vs {T5[(grp, i)]}+{v}")
            ok(T8[(grp, i)] == sum(disp[(k, grp, i)] for k in P5 + P3), f"s2 8prov sum {grp} {i}")
        # FS pills
        pills = [s for s in S if s['t'].endswith(' FS')]
        pills.sort(key=lambda s: s['g'][0])
        exp = [sum(A[k]['fs'][i] for k in P5 + P3) for i in (1, 2, 3)]
        ok([num(p['t'][:-3]) for p in pills] == exp, f"FS pills {[p['t'] for p in pills]} vs {exp}")
        print('FS pills', [p['t'] for p in pills], 'exp', exp)
        sub = [s for s in S if 'belum padam di 8 provinsi' in s['t']][0]['t']
        X8 = sum(round(A[k]['belum'][3]) for k in P5 + P3)
        m = re.search(r'±([\d.]+) ha', sub)
        ok(num(m.group(1)) == X8 == T8[('belum', 2)], f"s2 subtitle {m.group(1)} vs {X8} vs total {T8[('belum', 2)]}")
        print('s2 subtitle:', sub, '| X8 =', X8)
    if sl == 1:
        sub = [s for s in S if 'telah padam' in s['t']][0]['t']
        P = sum(round(A[k]['padam'][3]) for k in P5); B = sum(round(A[k]['belum'][3]) for k in P5)
        Ph = sum(hu(A[k]['padam'][3]) for k in P5)
        Q = round(P / (P + B) * 100)
        m = re.search(r'±([\d.]+) ha \((\d+) persen\) dari ±([\d.]+) ha api aktif telah padam pada 20 Okt, belum padam ±([\d.]+) ha', sub)
        ok(bool(m), 's1 subtitle pattern')
        if m:
            g = m.groups()
            ok((num(g[0]), int(g[1]), num(g[2]), num(g[3])) == (P, Q, P + B, B), f"s1 subtitle {g} vs {(P, Q, P + B, B)}")
            ok(B == T5[('belum', 2)], f"s1 subtitle B {B} vs total belum 20 {T5[('belum', 2)]}")
        print('s1 subtitle:', sub, '| P,Q,P+B,B =', P, Q, P + B, B, '| P half-up =', Ph, 'Q exact', P / (P + B) * 100)
    # leftovers
    raw = open(X + fn, encoding='utf-8').read()
    for bad in ('NA', '497,09', '272 FS', '269 FS', '279 FS', '502,08', '983,34', '481,26', '554,76', '452,49', '431,66', 'TARGET', 'belum termasuk'):
        hits = re.findall(r'<a:t>[^<]*' + re.escape(bad) + r'[^<]*</a:t>', raw)
        if bad == 'NA': hits = [h for h in hits if re.search(r'\bNA\b', h)]
        ok(not hits, f"s{sl} leftover {bad}: {hits}")
    commas = re.findall(r'<a:t>[^<]*\d,\d[^<]*</a:t>', raw)
    ok(not commas, f"s{sl} decimal-comma numbers left: {commas}")
print(f"checks: {nchk[0]}, failures: {len(errs)}")
for e in errs: print('FAIL', e)
