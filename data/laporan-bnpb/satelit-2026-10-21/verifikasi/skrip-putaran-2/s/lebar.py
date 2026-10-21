import struct, re, os
def font(fn):
    d = open(fn, 'rb').read()
    n = struct.unpack('>H', d[4:6])[0]; T = {}
    for i in range(n):
        tag, _, off, ln = struct.unpack('>4sIII', d[12 + 16 * i:28 + 16 * i]); T[tag.decode()] = off
    upem = struct.unpack('>H', d[T['head'] + 18:T['head'] + 20])[0]
    nh = struct.unpack('>H', d[T['hhea'] + 34:T['hhea'] + 36])[0]
    asc, desc, gap = struct.unpack('>hhh', d[T['hhea'] + 4:T['hhea'] + 10])
    adv = [struct.unpack('>H', d[T['hmtx'] + 4 * i:T['hmtx'] + 4 * i + 2])[0] for i in range(nh)]
    c = T['cmap']; nt = struct.unpack('>H', d[c + 2:c + 4])[0]; cmap = {}
    for i in range(nt):
        pid, eid, off = struct.unpack('>HHI', d[c + 4 + 8 * i:c + 12 + 8 * i]); o = c + off
        fmt = struct.unpack('>H', d[o:o + 2])[0]
        if fmt == 4 and not cmap:
            sc = struct.unpack('>H', d[o + 6:o + 8])[0] // 2
            ends = struct.unpack(f'>{sc}H', d[o + 14:o + 14 + 2 * sc]); p = o + 16 + 2 * sc
            starts = struct.unpack(f'>{sc}H', d[p:p + 2 * sc]); p += 2 * sc
            deltas = struct.unpack(f'>{sc}h', d[p:p + 2 * sc]); p += 2 * sc
            ro = p; rofs = struct.unpack(f'>{sc}H', d[p:p + 2 * sc])
            for k in range(sc):
                for ch in range(starts[k], ends[k] + 1):
                    if ch == 0xFFFF: continue
                    if rofs[k] == 0: g = (ch + deltas[k]) & 0xFFFF
                    else:
                        a = ro + 2 * k + rofs[k] + 2 * (ch - starts[k]); g = struct.unpack('>H', d[a:a + 2])[0]
                        if g: g = (g + deltas[k]) & 0xFFFF
                    cmap[ch] = g
    def w(s, pt):
        return sum(adv[min(cmap.get(ord(ch), 0), nh - 1)] for ch in s) / upem * pt
    return w, (asc - desc + gap) / upem
FD = os.path.expanduser('~/Library/Fonts/')
R, lhR = font(FD + 'Roboto-Regular.ttf'); B, lhB = font(FD + 'Roboto-Bold.ttf')
SP = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
EMU = 12700
for n in ('slide1', 'slide2'):
    s = open(SP + f'/verif3/x/ppt/slides/{n}.xml').read()
    sh = [m.group(0) for m in re.finditer(r'<p:sp>.*?</p:sp>', s, re.S) if 'y="905256"' in m.group(0)][0]
    tot = 0; txt = ''
    for rpr, t in re.findall(r'<a:r><a:rPr([^>]*)>.*?<a:t>([^<]*)</a:t></a:r>', sh, re.S):
        sz = int(re.search(r'sz="(\d+)"', rpr).group(1)) / 100
        tot += (B if 'b="1"' in rpr else R)(t, sz); txt += t
    x0 = 548640; end = x0 + tot * EMU
    print(n, repr(txt))
    print(f'  width {tot:.1f} pt = {tot*EMU:.0f} EMU; text spans x {x0}..{end:.0f}; box right {x0+10454335}; CUT OFF box left 8849380; gap {8849380-end:.0f} EMU ({(8849380-end)/EMU:.1f} pt)')
    print(f'  line height 12pt ~{lhR*12:.1f} pt; text box bottom-anchored: line top ~{905256+256032-lhR*12*EMU:.0f}, CUT OFF box y 896112..1124712')
