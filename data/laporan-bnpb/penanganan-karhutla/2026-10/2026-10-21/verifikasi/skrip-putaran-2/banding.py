import json
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
a = json.load(open(S + "angka.json")); u = json.load(open(S + "verif3/ulang.json"))
print("porsi diff", a["porsi"] - u["porsi"])
n = bad = 0; mx = 0
for k, R in u["prov"].items():
    for m in ("hot", "luas", "belum", "padam", "fs"):
        for i in range(4):
            n += 1; d = a["prov"][k][m][i] - R[m][i]; mx = max(mx, abs(d))
            if abs(d) > 0.5:
                bad += 1; print("DIFF", k, m, 17 + i, a["prov"][k][m][i], R[m][i])
print("compared", n, "diffs>0.5", bad, "max abs diff", mx)
