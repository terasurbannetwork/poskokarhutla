"""Cross-check: expected display ints/subtitles from verified values vs text in final deck slides 1-2."""
import json, re, zipfile
from decimal import Decimal, ROUND_HALF_UP
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
u = json.load(open(S + "verif3/ulang.json"))["prov"]
R = lambda x: int(Decimal(repr(x)).quantize(Decimal(1), ROUND_HALF_UP))
fmt = lambda n: f"{n:,}".replace(",", ".")
s1, s2 = ["62", "16", "63", "15", "61"], ["93", "72", "64"]
P = sum(R(u[k]["padam"][3]) for k in s1); T = sum(R(u[k]["luas"][2]) for k in s1)
B = sum(R(u[k]["belum"][3]) for k in s1); X = B + sum(R(u[k]["belum"][3]) for k in s2)
print("expected P,T,Q,B,X:", P, T, R(P / T * 100), B, X)
z = zipfile.ZipFile("/Users/alfatehanseptianta/Downloads/Laporan Penanganan Pengendalian Karhutla 211026 data satelit.pptx")
for i in (1, 2):
    txt = " | ".join(t for t in re.findall(r"<a:t>([^<]*)</a:t>", z.read(f"ppt/slides/slide{i}.xml").decode()) if t.strip())
    print(f"--- slide{i} text ---\n{txt}\n")
for k in s1 + s2:
    print(k, {m: [fmt(R(v)) for v in u[k][m][1:]] for m in ("hot", "luas", "belum", "padam", "fs")})
