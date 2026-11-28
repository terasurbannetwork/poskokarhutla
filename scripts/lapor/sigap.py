"""Render 3D Sigap: samakan skala dan posisi, tempel lambang BNPB asli di lingkaran putih helm, simpan WebP 640 px.

Pakai (data/kajian-bnpb/lapor-ai/PROMPT-SIGAP.md):
    python3 scripts/lapor/sigap.py <folder render> [nama ...]
    nama bisa grup "diam+kedip+lambai1": bingkai satu urutan diukur sekali dari bingkai pertama.
Berkas masukan <folder>/<nama>.webp|.png (latar transparan, ukuran bebas); keluaran public/lapor/sigap/<nama>.webp.
Tanpa nama: semua .webp/.png di folder. Butuh Pillow dan cwebp (Homebrew).

Supaya bingkai bisa diputar bergantian tanpa meloncat (26 Nov 2026), tiap render diskalakan dari LEBAR HELM
(bagian badan paling tetap di semua pose, termasuk jongkok) dan digeser sehingga tengah helm di tengah kanvas
dan ujung sepatu di garis tanah yang sama. Lingkaran lencana dicari sebagai gumpalan putih terbesar di dalam kotak helm,
jadi gelembung pikiran putih di samping kepala tidak ikut tertempel lambang.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

AKAR = Path(__file__).resolve().parents[2]
LOGO = AKAR / "public/lapor/lambang-bnpb.png"
KELUAR = AKAR / "public/lapor/sigap"
SISI, HELM, TANAH = 640, 236, 628   # kanvas, lebar helm, garis ujung sepatu (piksel keluaran)


def oranye(r, g, b, a):
    return a > 200 and r > 200 and 70 < g < 175 and b < 90


def helm(im, f=2):
    """Kotak helm (x0, y0, x1, y1) dan garis kaki: gumpalan oranye terbesar dari puncak oranye sampai 22 persen tinggi badan di bawahnya
    (gumpalan terbesar, supaya bohlam, antena HT, atau garis gerak kuning di samping kepala tidak ikut terhitung)."""
    sm = im.resize((im.width // f, im.height // f), Image.NEAREST); px = sm.load(); w, h = sm.size
    bb = sm.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
    atas = next(y for y in range(h) if any(oranye(*px[x, y]) for x in range(w)))
    batas = atas + int((bb[3] - bb[1]) * .22)
    sisa = {(x, y) for y in range(atas, batas) for x in range(w) if oranye(*px[x, y])}; best = []
    while sisa:
        st = [sisa.pop()]; comp = []
        while st:
            c = st.pop(); comp.append(c)
            for n in ((c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1)):
                if n in sisa: sisa.discard(n); st.append(n)
        if len(comp) > len(best): best = comp
    xs = [c[0] for c in best]; ys = [c[1] for c in best]
    return min(xs) * f, min(ys) * f, (max(xs) + 1) * f, batas * f, bb[3] * f


def lingkaran(im, kotak, f=4, bulat=None, terang=215):
    """Gumpalan putih terbesar di dalam kotak; bulat=(dmin, dmax) hanya menerima gumpalan berbentuk lingkaran berdiameter itu
    (lencana dada), supaya kertas papan klip, layar HP, atau kilau pita reflektor tidak ikut."""
    x0, y0, x1, y1 = (v // f for v in kotak)
    sm = im.resize((im.width // f, im.height // f)); px = sm.load()
    putih = lambda x, y: (lambda r, g, b, a: a > 200 and r > terang and g > terang - 5 and b > terang - 10 and max(r, g, b) - min(r, g, b) < 30)(*px[x, y])
    seen, best = set(), []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if (x, y) in seen or not putih(x, y):
                continue
            st, comp = [(x, y)], []; seen.add((x, y))
            while st:
                cx, cy = st.pop(); comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if x0 <= nx < x1 and y0 <= ny < y1 and (nx, ny) not in seen and putih(nx, ny):
                        seen.add((nx, ny)); st.append((nx, ny))
            if bulat:
                xs = [p[0] for p in comp]; ys = [p[1] for p in comp]; w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
                if not (bulat[0] <= min(w, h) * f and max(w, h) * f <= bulat[1] and .78 < w / h < 1.28 and .6 < len(comp) / (w * h) < .92):
                    continue
            if len(comp) > len(best):
                best = comp
    if not best:
        return None
    xs = [p[0] for p in best]; ys = [p[1] for p in best]
    return min(xs) * f, min(ys) * f, (max(xs) + 1) * f, (max(ys) + 1) * f


def olah(src, nama, ukur=None):
    """ukur: hasil helm() bingkai pertama segrup; bingkai satu urutan (A+B+C) memakai skala dan geser yang sama supaya tidak berdenyut."""
    im = Image.open(src).convert("RGBA")
    hx0, hy0, hx1, hy1, kaki = ukur or helm(im)
    hb = helm(im)   # lencana dicari di bingkai ini sendiri walau skala dan geser dipakai bersama segrup
    k = lingkaran(im, hb[:4])
    tinggi, lebar = hb[4] - hb[1], hb[2] - hb[0]
    dada = lingkaran(im, (hb[0], hb[1] + int(tinggi * .38), hb[2], hb[1] + int(tinggi * .65)), f=2, bulat=(lebar * .06, lebar * .22), terang=185)
    for c in (k, dada):   # lambang 96 persen diameter lingkaran putih (helm dan lencana dada, pemilik 26 Nov 2026)
        if c:
            x0, y0, x1, y1 = c; d = min(x1 - x0, y1 - y0) * .96
            im.alpha_composite(Image.open(LOGO).convert("RGBA").resize((int(d), int(d)), Image.LANCZOS), (int((x0 + x1 - d) / 2), int((y0 + y1 - d) / 2)))
    im.putalpha(im.getchannel("A").point(lambda v: 0 if v < 48 else v))   # buang kabut tembus pandang di sekitar badan (tampak seperti lingkaran cahaya di latar gelap)
    s = HELM / (hx1 - hx0)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    kanvas = Image.new("RGBA", (SISI, SISI))
    dx, dy = round(SISI / 2 - (hx0 + hx1) / 2 * s), round(TANAH - kaki * s)
    kanvas.alpha_composite(im, (max(dx, 0), max(dy, 0)), (max(-dx, 0), max(-dy, 0)))
    bb = kanvas.getchannel("A").getbbox(); kepotong = bb and (bb[0] == 0 or bb[1] == 0 or bb[2] == SISI)
    with tempfile.TemporaryDirectory() as t:
        png = Path(t) / "a.png"; kanvas.save(png)
        subprocess.run(["cwebp", "-quiet", "-q", "80", "-alpha_q", "85", "-m", "6", str(png), "-o", str(KELUAR / f"{nama}.webp")], check=True)
    print(nama, "helm" if k else "TANPA lencana helm", "dada" if dada else "TANPA lencana dada", f"skala {s:.3f}", "TERPOTONG" if kepotong else "", (KELUAR / f"{nama}.webp").stat().st_size // 1024, "KB")
    return hx0, hy0, hx1, hy1, kaki


if __name__ == "__main__":
    folder = Path(sys.argv[1]); KELUAR.mkdir(parents=True, exist_ok=True)
    daftar = sys.argv[2:] or sorted({p.stem for p in folder.iterdir() if p.suffix in (".webp", ".png")})
    for grup in daftar:   # "a+b+c" = satu urutan bingkai dengan ukuran bersama
        ukur = None
        for n in grup.split("+"):
            src = next((folder / f"{n}{e}" for e in (".webp", ".png") if (folder / f"{n}{e}").exists()), None)
            if src:
                ukur = olah(src, n, ukur)
            else:
                print(n, "tidak ada")
