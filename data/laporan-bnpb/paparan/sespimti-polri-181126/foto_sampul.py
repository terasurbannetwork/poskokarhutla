#!/usr/bin/env python3
"""Foto sampul dan foto isi handout.

Sampul: Kepala BNPB memantau karhutla Taman Nasional Way Kambas dari helikopter, 24 Oktober 2026
(siaran pers BNPB no. 814, bnpb.go.id). Dipotong ke bidang 210 x 116 mm (2100 x 1160 px).
Isi: foto lapangan siaran pers BNPB dan tangkapan layar panel publik Centurisk97 (ss.mjs), diperkecil ke gambar/.
"""
from pathlib import Path
from PIL import Image

SINI = Path(__file__).resolve().parent
F, G = SINI / "foto", SINI / "gambar"

from PIL import ImageFilter
im = Image.open(F / "bnpb-waykambas-241026.jpg").convert("RGB")
W, H = 2100, 1160
KANAN = 290                          # pita kanan: kotak logo KRIS sampul jatuh di sini, bukan di kepala
skala = H / im.height
im = im.resize((int(im.width * skala), H), Image.LANCZOS)
lebar_foto = W - KANAN
im = im.crop((im.width - lebar_foto, 0, im.width, H))   # buang sisi kiri (lanskap), Kepala BNPB bergeser ke kiri
navy = Image.new("RGB", (W, H), (5, 28, 44))
kanvas = navy.copy()
kanvas.paste(im, (0, 0))
# gradasi ke navy mulai x = 1500: halus, tanpa tepi; kotak logo KRIS duduk di atas navy
alfa = Image.new("L", (W, H))
mulai = 1420
for x in range(W):
    v = 0 if x < mulai else int(255 * min(1, (x - mulai) / (lebar_foto - mulai)) ** 1.3)
    alfa.paste(v, (x, 0, x + 1, H))
kanvas = Image.composite(navy, kanvas, alfa)
kanvas.save(F / "sampul-waykambas.jpg", quality=92)

for src, dst, lebar in [("bnpb-subulussalam-171126.jpg", "foto_subulussalam.jpg", 1600),
                        ("bnpb-hutanambolon-171126.jpg", "foto_hutanambolon.jpg", 1600)]:
    x = Image.open(F / src).convert("RGB"); x.thumbnail((lebar, lebar)); x.save(G / dst, quality=88)
for nama in ("ss_presiden_peta", "ss_presiden_kartu"):
    p = G / f"{nama}.png"
    if p.exists():
        x = Image.open(p).convert("RGB"); x.thumbnail((2000, 2000)); x.save(G / f"{nama}.jpg", quality=88); p.unlink()
print("ok")
