"""World Bank Commodity Price Data (Pink Sheet), bulanan -> public/data/harga_komoditas.json.
Sumber: https://www.worldbank.org/en/research/commodity-markets  (CC BY 4.0, World Bank).
Hanya stdlib: xlsx = zip berisi XML.   python3 harga_komoditas.py [berkas.xlsx]  (tanpa argumen: unduh)
Self-check: python3 harga_komoditas.py uji
"""
import io, json, re, sys, zipfile, urllib.request, datetime as dt
from pathlib import Path
URL = "https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx"
OUT = Path(__file__).resolve().parents[2] / "public/data/harga_komoditas.json"
SERI = {"palm_oil": "Palm oil", "rubber_rss3": "Rubber, RSS3", "coconut_oil": "Coconut oil"}
DARI = "2010M01"


def kolom(ref):
    n = 0
    for c in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(c) - 64
    return n


def baca(data):
    z = zipfile.ZipFile(io.BytesIO(data))
    ss = [''.join(re.findall(r"<t[^>]*>([^<]*)</t>", x))
          for x in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode(), re.S)]
    baris = {}
    for r in re.findall(r"<row [^>]*>.*?</row>", z.read("xl/worksheets/sheet2.xml").decode(), re.S):
        for attr, v in re.findall(r"<c ([^>]*?)>\s*<v>([^<]*)</v>", r):
            ref = re.search(r'r="([A-Z]+\d+)"', attr).group(1)
            t = re.search(r' t="(\w+)"', " " + attr)
            baris.setdefault(int(re.search(r"\d+", ref).group()), {})[kolom(ref)] = \
                ss[int(v)] if t and t.group(1) == "s" else v
    return baris


def olah(baris):
    kol = {}
    for i in range(1, 12):
        for k, v in baris.get(i, {}).items():
            for nm, jd in SERI.items():
                if v.strip() == jd and nm not in kol:
                    kol[nm] = k
    assert len(kol) == len(SERI), f"kolom tak ditemukan: {kol}"
    out = {nm: {} for nm in SERI}
    for r, c in baris.items():
        b = c.get(1, "")
        if re.fullmatch(r"\d{4}M\d\d", b) and b >= DARI:
            for nm, k in kol.items():
                try:
                    out[nm][b] = round(float(c[k]), 2)
                except (KeyError, ValueError):
                    pass
    return out


def main():
    data = open(sys.argv[1], "rb").read() if len(sys.argv) > 1 else urllib.request.urlopen(URL, timeout=90).read()
    s = olah(baca(data))
    bln = sorted(s["palm_oil"])
    j = {"sumber": "World Bank Commodity Price Data (The Pink Sheet), harga nominal bulanan",
         "lisensi": "CC BY 4.0, The World Bank Group. https://www.worldbank.org/en/research/commodity-markets",
         "satuan": "palm_oil & coconut_oil USD/ton; rubber_rss3 USD/kg (rata-rata bulanan)",
         "dibuat": dt.date.today().isoformat(), "bulan_awal": bln[0], "bulan_akhir": bln[-1], "seri": s}
    OUT.write_text(json.dumps(j, separators=(",", ":"), ensure_ascii=False))
    print(OUT, OUT.stat().st_size, "B", bln[0], bln[-1])


def uji():
    s = json.loads(OUT.read_text())["seri"]
    assert OUT.stat().st_size <= 200_000
    assert len(s["palm_oil"]) > 150 and all(200 < v < 3000 for v in s["palm_oil"].values()), "CPO di luar USD 200-3000/t"
    assert s["palm_oil"]["2022M03"] > 1500, s["palm_oil"]["2022M03"]
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
