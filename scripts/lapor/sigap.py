"""Render 3D Sigap: tempel lambang BNPB asli di lingkaran putih helm, perkecil ke 640 px, simpan WebP.

Pakai (data/kajian-bnpb/lapor-ai/PROMPT-SIGAP.md):
    python3 scripts/lapor/sigap.py <folder render> [nama ...]
Berkas masukan <folder>/<nama>.webp|.png (1254x1254, latar transparan); keluaran public/lapor/sigap/<nama>.webp.
Tanpa nama: semua .webp/.png di folder. Butuh Pillow dan cwebp (Homebrew).
Lingkaran dicari sebagai gumpalan putih terbesar di 45 persen atas gambar; lambang dibuat 96 persen diameternya.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

AKAR = Path(__file__).resolve().parents[2]
LOGO = AKAR / "public/lapor/lambang-bnpb.png"
KELUAR = AKAR / "public/lapor/sigap"


def lingkaran(im, f=4):
    sm = im.resize((im.width // f, im.height // f)); w, h = sm.size; px = sm.load()
    putih = lambda x, y: (lambda r, g, b, a: a > 200 and r > 215 and g > 210 and b > 205 and max(r, g, b) - min(r, g, b) < 30)(*px[x, y])
    seen, best = set(), []
    for y in range(int(h * .45)):
        for x in range(w):
            if (x, y) in seen or not putih(x, y):
                continue
            st, comp = [(x, y)], []; seen.add((x, y))
            while st:
                cx, cy = st.pop(); comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and putih(nx, ny):
                        seen.add((nx, ny)); st.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    if not best:
        return None
    xs = [p[0] for p in best]; ys = [p[1] for p in best]
    return min(xs) * f, min(ys) * f, (max(xs) + 1) * f, (max(ys) + 1) * f


def olah(src, nama):
    im = Image.open(src).convert("RGBA")
    k = lingkaran(im)
    if k:
        x0, y0, x1, y1 = k; d = min(x1 - x0, y1 - y0) * .96
        im.alpha_composite(Image.open(LOGO).convert("RGBA").resize((int(d), int(d)), Image.LANCZOS), (int((x0 + x1 - d) / 2), int((y0 + y1 - d) / 2)))
    with tempfile.TemporaryDirectory() as t:
        png = Path(t) / "a.png"; im.resize((640, 640), Image.LANCZOS).save(png)
        subprocess.run(["cwebp", "-quiet", "-q", "80", "-alpha_q", "85", "-m", "6", str(png), "-o", str(KELUAR / f"{nama}.webp")], check=True)
    print(nama, "lambang" if k else "TANPA lingkaran putih", (KELUAR / f"{nama}.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    folder = Path(sys.argv[1]); KELUAR.mkdir(parents=True, exist_ok=True)
    daftar = sys.argv[2:] or sorted({p.stem for p in folder.iterdir() if p.suffix in (".webp", ".png")})
    for n in daftar:
        src = next((folder / f"{n}{e}" for e in (".webp", ".png") if (folder / f"{n}{e}").exists()), None)
        if src:
            olah(src, n)
        else:
            print(n, "tidak ada")
