import json, zipfile, re
S = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
mine = json.load(open(S + '/verif/mine.json'))
pp = '/Users/alfatehanseptianta/Downloads/Laporan Penanganan Pengendalian Karhutla 211026 data satelit.pptx'
z = zipfile.ZipFile(pp)
bad = 0
for sl, provs in (('ppt/slides/slide1.xml', ['62', '16', '63', '15', '61']), ('ppt/slides/slide2.xml', ['93', '72', '64'])):
    x = z.read(sl).decode('utf8')
    runs = re.findall(r'<a:r>(.*?)</a:r>', x, re.S)
    # arrow runs with colour
    seq = []
    for r in runs:
        t = re.search(r'<a:t>([^<]*)</a:t>', r)
        if not t: continue
        t = t.group(1)
        if re.fullmatch(r'[\d.]+', t) or re.fullmatch(r'[▲▼]?-?\d+%', t):
            c = re.search(r'srgbClr val="([0-9A-Fa-f]{6})"', r)
            seq.append((t, c.group(1).upper() if c else None))
    # province blocks are the trailing 18*len(provs) entries
    blk = seq[-18 * len(provs):]
    i = 0
    for p in provs:
        for k in ('hot', 'luas', 'belum'):
            for d in (1, 2, 3):
                num, _ = blk[i]; arr, col = blk[i + 1]; i += 2
                cur = round(mine[p][k][d]); prev = round(mine[p][k][d - 1])
                exp_num = f'{cur:,}'.replace(',', '.')
                pct = round((cur - prev) / prev * 100) if prev else None
                exp_arr = ('▲%d%%' % pct if pct > 0 else '▼%d%%' % -pct if pct < 0 else '0%') if pct is not None else ''
                exp_col = 'D9600B' if pct and pct > 0 else '2F86D1' if pct and pct < 0 else None
                # unrounded-based pct, to detect sensitivity
                pu = round((mine[p][k][d] - mine[p][k][d - 1]) / mine[p][k][d - 1] * 100)
                ok = num == exp_num and arr == exp_arr and (exp_col is None or col == exp_col)
                if not ok or pu != pct:
                    bad += not ok
                    print(sl[-10:], p, k, d, 'deck', num, arr, col, '| expect', exp_num, exp_arr, exp_col, '| pct from unrounded', pu)
print('deck cell mismatches:', bad)
