"""Assert every province row (value+arrow), totals, and FS pills in deck text equal what the verified values imply."""
import json, re, zipfile
from decimal import Decimal, ROUND_HALF_UP
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
u = json.load(open(S + "angka.json"))["prov"]
R = lambda x: int(Decimal(repr(x)).quantize(Decimal(1), ROUND_HALF_UP))
fmt = lambda n: f"{n:,}".replace(",", ".")
def arrow(c, p):
    v = R((c - p) / p * 100)
    return f"▲{v}%" if v > 0 else (f"▼{-v}%" if v < 0 else "0%")
z = zipfile.ZipFile("/Users/alfatehanseptianta/Downloads/Laporan Penanganan Pengendalian Karhutla 211026 data satelit.pptx")
ok = bad = 0
for i, provs in ((1, ["62", "16", "63", "15", "61"]), (2, ["93", "72", "64"])):
    x = z.read(f"ppt/slides/slide{i}.xml").decode()
    toks = [t for t in re.findall(r"<a:t>([^<]*)</a:t>", x) if t.strip()]
    s = "|".join(toks)
    for k in provs:
        seq = []
        for m in ("hot", "luas", "belum"):
            v = [R(a) for a in u[k][m]]
            for j in (1, 2, 3):
                seq += [fmt(v[j]), arrow(v[j], v[j - 1])]
        if "|".join(seq) in s: ok += 1
        else: bad += 1; print("ROW MISMATCH slide", i, k, seq)
    tot = [fmt(sum(R(u[k][m][j]) for k in provs)) for m in ("hot", "luas", "belum") for j in (1, 2, 3)]
    print("slide", i, "totals", tot, "found" if "|".join(tot) in s else "MISSING")
    # arrow colours: every ▲ run D9600B, ▼ run 2F86D1
    for sym, col in (("▲", "D9600B"), ("▼", "2F86D1")):
        runs = re.findall(r"<a:r>(.*?)</a:r>", x, re.S)
        wrong = [r for r in runs if f"<a:t>{sym}" in r and col not in r]
        print(f"slide {i} {sym} runs without {col}: {len(wrong)} of {sum(f'<a:t>{sym}' in r for r in runs)}")
all8 = ["62", "16", "63", "15", "61", "93", "72", "64"]
print("8-prov FS pills expected", [sum(u[k]["fs"][j] for k in all8) for j in (1, 2, 3)])
print("8-prov totals expected", [fmt(sum(R(u[k][m][j]) for k in all8)) for m in ("hot", "luas", "belum") for j in (1, 2, 3)])
print("rows ok", ok, "bad", bad)
