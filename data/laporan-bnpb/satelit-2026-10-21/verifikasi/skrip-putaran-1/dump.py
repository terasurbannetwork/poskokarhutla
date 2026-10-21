import sys, re, xml.etree.ElementTree as ET
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
path = sys.argv[1]
root = ET.parse(path).getroot()
for sp in root.iter('{%s}sp' % NS['p']):
    off = sp.find('.//a:xfrm/a:off', NS); ext = sp.find('.//a:xfrm/a:ext', NS)
    x = off.get('x') if off is not None else '?'; y = off.get('y') if off is not None else '?'
    cx = ext.get('cx') if ext is not None else '?'; cy = ext.get('cy') if ext is not None else '?'
    sppr = sp.find('p:spPr', NS)
    fill = ''
    if sppr is not None:
        sf = sppr.find('a:solidFill', NS)
        if sf is not None:
            c = sf[0]; fill = c.get('val', '')
    runs = []
    cols = set()
    for r in sp.iter('{%s}r' % NS['a']):
        t = r.find('a:t', NS)
        rp = r.find('a:rPr', NS)
        if rp is not None:
            sf = rp.find('a:solidFill', NS)
            if sf is not None: cols.add(sf[0].get('val', sf[0].tag.split('}')[1]))
        runs.append(t.text or '')
    paras = []
    for p_ in sp.iter('{%s}p' % NS['a']):
        paras.append(''.join((t.text or '') for t in p_.iter('{%s}t' % NS['a'])))
    name = sp.find('.//p:cNvPr', NS).get('name')
    print(f"{x}\t{y}\t{cx}\t{cy}\tfill={fill}\ttc={','.join(sorted(cols))}\t{name}\t{' | '.join(paras)!r}")
