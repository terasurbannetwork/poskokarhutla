"""Peta rute check point 30 Okt + hotspot 31 Okt (hari terbang) di atas citra Esri. Keluaran data/merauke/peta-rute.png."""
import io, json, math, re, sys, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
AKAR = Path(__file__).resolve().parents[1]
H72, GPX = sys.argv[1], sys.argv[2]
LA0, LA1, LO0, LO1, Z = -8.60, -7.72, 139.88, 140.78, 11
def xy(la, lo):
    n = 2 ** Z; x = (lo + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * n
    return x * 256, y * 256
x0, y0 = xy(LA1, LO0); x1, y1 = xy(LA0, LO1)
tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)
big = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        u = f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{ty}/{tx}'
        b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'renlap/1.0'}), timeout=60).read()
        big.paste(Image.open(io.BytesIO(b)).convert('RGB'), ((tx - tx0) * 256, (ty - ty0) * 256))
img = big.crop((int(x0 - tx0 * 256), int(y0 - ty0 * 256), int(x1 - tx0 * 256), int(y1 - ty0 * 256)))
K = 2; img = img.resize((img.width * K, img.height * K), Image.LANCZOS)
img = Image.blend(img, Image.new('RGB', img.size, 'white'), 0.18)
def P(la, lo):
    x, y = xy(la, lo); return (x - x0) * K, (y - y0) * K
d = ImageDraw.Draw(img, 'RGBA')
f = lambda s, b=True: ImageFont.truetype(str((Path.home() / '.claude/skills/ppt-konsultan/bnpb/assets/fonts') / f'Roboto-{"Bold" if b else "Medium"}.ttf'), s)
h = json.load(open(H72)); W = h['wilayah']
for r in h['baris']:
    if r[7] == '10-31' and LA0 < r[0] < LA1 and LO0 < r[1] < LO1:
        x, y = P(r[0], r[1]); rr = 5 if r[4] < 50 else 8
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(239, 68, 68, 230), outline=(255, 255, 255, 200))
s = open(GPX).read()
cp = [(n, float(a), float(b)) for a, b, n in re.findall(r'<wpt lat="([^"]+)" lon="([^"]+)">\s*<name>([^<]+)</name>', s)]
pts = [P(a, b) for _, a, b in cp] + [P(cp[0][1], cp[0][2])]
d.line(pts, fill=(20, 40, 90, 255), width=5)
for n, a, b in cp:
    x, y = P(a, b); big_ = n in ('MOPAH', 'MSJ', 'MEDCO'); rr = 14 if big_ else 11
    d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 255, 255, 255), outline=(20, 40, 90, 255), width=4)
    lab = {'MOPAH': 'Bandara Mopah', 'MSJ': 'PT Merauke Sawit Jaya', 'MEDCO': 'PT Medcopapua Alam Lestari'}.get(n, n.replace('CP', 'CP-'))
    ft = f(30 if big_ else 26)
    w = d.textlength(lab, font=ft); lx = x + 18 if n not in ('CP7', 'CP8') else x - 18 - w
    ly = y - 16 + (30 if n in ('MEDCO',) else 0) - (26 if n == 'CP7' else 0)
    d.rounded_rectangle((lx - 6, ly - 4, lx + w + 6, ly + 34), 6, fill=(255, 255, 255, 235))
    d.text((lx, ly), lab, font=ft, fill=(20, 40, 90))
# skala 10 km
kmpx = (P(LA0 + .03, LO0 + .05 + 10 / 110.6)[0] - P(LA0 + .03, LO0 + .05)[0])
sx, sy = 40, img.height - 60
d.rectangle((sx - 10, sy - 44, sx + kmpx + 130, sy + 20), fill=(255, 255, 255, 235))
d.line((sx, sy, sx + kmpx, sy), fill=(20, 40, 90), width=6); d.text((sx + kmpx + 10, sy - 20), '10 km', font=f(28), fill=(20, 40, 90))
img.save(AKAR / 'data/merauke/peta-rute.png')
print(img.size)
