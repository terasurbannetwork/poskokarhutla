"""Check the final PPTX slides 1-2 against angka.json: labels, arrows, colours, bars, ids, leftovers."""
import json, re, sys, zipfile
from collections import Counter
SP, DECK = sys.argv[1], sys.argv[2]
A = json.load(open(SP + '/angka.json'))['prov']
z = zipfile.ZipFile(DECK); src = zipfile.ZipFile(SP + '/deck/src.pptx')
LX = {'hot': [4663440, 5372913, 6082386], 'luas': [6974738, 7684211, 8393684], 'belum': [9286037, 9995510, 10704982]}
BX = {'hot': [4914907, 5624380, 6333853], 'luas': [7226206, 7935678, 8645151], 'belum': [9537504, 10246977, 10956450]}
def f0(v):
    # half-up integer for checking; report banker's-vs-half-up separately
    return f"{int(v + 0.5) if v >= 0 else -int(-v + 0.5):,}".replace(',', '.')
def shapes(s):
    out = []
    for m in re.finditer(r'<p:sp>.*?</p:sp>', s, re.S):
        b = m.group(0)
        g = re.search(r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', b)
        t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))
        fill = re.search(r'<p:spPr>.*?<a:solidFill><a:srgbClr val="(\w+)"', b, re.S)
        tcol = re.findall(r'<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val="(\w+)"', b)
        idm = re.search(r'<p:cNvPr id="(\d+)"', b)
        out.append(dict(g=tuple(map(int, g.groups())) if g else None, t=t, fill=fill and fill.group(1), tcol=tcol, id=idm and idm.group(1)))
    return out
def exp_arrow(cur, prev):
    if not prev: return ('', None) if cur else ('0%', '6B7280')
    p = (cur - prev) / prev * 100
    p = int(p + 0.5) if p >= 0 else -int(-p + 0.5)
    if p > 0: return (f'▲{p:,}%'.replace(',', '.'), 'D9600B')
    if p < 0: return (f'▼{-p:,}%'.replace(',', '.'), '2F86D1')
    return ('0%', '6B7280')
issues = []
for sl, bases, H, kode in (('slide1', [2587752, 3209544, 3831336, 4453128, 5074920], 201168, ['62', '16', '63', '15', '61']),
                          ('slide2', [2697480, 3429000, 4160520], 310896, ['93', '72', '64'])):
    s = z.read(f'ppt/slides/{sl}.xml').decode()
    sh = shapes(s)
    ids = Counter(x['id'] for x in sh if x['id'])
    # also count ids inside pictures/groups
    allids = Counter(re.findall(r'<p:cNvPr id="(\d+)"', s))
    dup = {k: v for k, v in allids.items() if v > 1}
    if dup: issues.append(f'{sl}: duplicate cNvPr ids {dup}')
    # province names vs row base
    for base, k in zip(bases, kode):
        names = [x for x in sh if x['g'] and x['g'][0] < 3000000 and base - H - 300000 < x['g'][1] < base + 100000 and x['t'].strip()]
        print(sl, k, 'row texts left side:', [x['t'] for x in names][:3])
        for grp in ('hot', 'luas', 'belum'):
            v = A[k][grp]
            mx = max(v[1:4]) or 1
            for i in range(3):
                cur, prev = v[i + 1], v[i]
                lab = [x for x in sh if x['g'] and x['g'][0] == LX[grp][i] and base - H - 260000 < x['g'][1] < base - 100000 + 100000 and x['g'][3] == 164592]
                arr = [x for x in sh if x['g'] and x['g'][0] == LX[grp][i] and x['g'][1] == base + 18288]
                bar = [x for x in sh if x['g'] and x['g'][0] == BX[grp][i] and base - H - 50000 < x['g'][1] < base and x['g'][2] == 297979]
                if len(lab) != 1 or len(arr) != 1 or len(bar) != 1:
                    issues.append(f'{sl} {k} {grp} {i}: shapes lab={len(lab)} arr={len(arr)} bar={len(bar)} -> {[x["t"] for x in lab]}')
                    continue
                if lab[0]['t'] != f0(cur):
                    issues.append(f'{sl} {k} {grp} day{i+1}: label {lab[0]["t"]!r} vs half-up {f0(cur)!r} (raw {cur})')
                ea, ec = exp_arrow(cur, prev)
                if arr[0]['t'] != ea: issues.append(f'{sl} {k} {grp} day{i+1}: arrow {arr[0]["t"]!r} vs {ea!r}')
                if ec and ec not in arr[0]['tcol']: issues.append(f'{sl} {k} {grp} day{i+1}: arrow colour {arr[0]["tcol"]} vs {ec}')
                bc = {'D9600B': 'D9600B', '2F86D1': '2F86D1'}.get(ec, 'A9B4C2')
                if bar[0]['fill'] != bc: issues.append(f'{sl} {k} {grp} day{i+1}: bar fill {bar[0]["fill"]} vs {bc}')
                eh = max(18288, round(H * cur / mx))
                gx, gy, gcx, gcy = bar[0]['g']
                if gcy != eh or gy + gcy != base: issues.append(f'{sl} {k} {grp} day{i+1}: bar h {gcy} (bottom {gy+gcy}) vs {eh} (base {base})')
    # leftovers from template: any text that looks like an old decimal-comma number
    old = [x['t'] for x in sh if re.fullmatch(r'[▲▼]?\d+,\d+( ha)?%?', x['t'].strip())]
    if old: issues.append(f'{sl}: leftover decimal-comma texts {old}')
    na = [x['t'] for x in sh if x['t'].strip() == 'NA']
    if na: issues.append(f'{sl}: NA labels remain {len(na)}')
    # compare with the template: which text shapes vanished / were added
    s0 = src.read(f'ppt/slides/{sl}.xml').decode()
    t0 = Counter(x['t'] for x in shapes(s0) if x['t'].strip()); t1 = Counter(x['t'] for x in sh if x['t'].strip())
    print(sl, 'template-only texts:', sorted((t0 - t1).elements())[:80])
print('ISSUES:', len(issues)); [print(' ', i) for i in issues]
