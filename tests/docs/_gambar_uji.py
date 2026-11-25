"""Pembantu uji gambar Docs: memanggil fungsi bangun.py dengan folder gambar sementara, mencetak hasil sebagai JSON.
Dipanggil tests/docs/gambar.test.mjs: python -I tests/docs/_gambar_uji.py <folder-sementara>"""
import json
import struct
import sys
from pathlib import Path

akar = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(akar / "scripts" / "docs"))
import bangun  # noqa: E402

tmp = Path(sys.argv[1])
bangun.GAMBAR = tmp

SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 120" width="720" height="120"><defs>'
       '<marker id="p" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" class="dg-garis"/></marker></defs>'
       '<rect x="4" y="4" width="200" height="60" rx="8" class="dg-kotak"/><text x="20" y="40" class="dg-teks" font-size="14">Kotak &amp; teks</text>'
       '<line x1="204" y1="34" x2="300" y2="34" class="dg-garis" marker-end="url(#p)"/></svg>')
(tmp / "arsitektur-alur.svg").write_text(SVG, encoding="utf-8")
png = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", 640, 360) + b"\x08\x02\x00\x00\x00" + b"\x00" * 4
(tmp / "layar-peta.png").write_bytes(png)
webp = b"RIFF" + struct.pack("<I", 30) + b"WEBPVP8X" + struct.pack("<I", 10) + b"\x00\x00\x00\x00" + (799).to_bytes(3, "little") + (449).to_bytes(3, "little")
(tmp / "layar-lapor.webp").write_bytes(webp)
(tmp / "jahat.svg").write_text(SVG.replace("</svg>", "<script>alert(1)</script></svg>"), encoding="utf-8")
(tmp / "warna.svg").write_text(SVG.replace('class="dg-kotak"', 'class="dg-kotak" fill="#ff0000"'), encoding="utf-8")


def fig(md):
    galat = []
    blok = bangun.parse_blok(md.split("\n"))
    h = bangun.render_blok(blok, galat, bangun.Pemberi())
    return {"html": h, "galat": [g[1] for g in galat]}


hasil = {
    "svg": fig("![Alur dari kotak ke garis](gambar/arsitektur-alur.svg)"),
    "png": fig("![Tampilan peta utama](gambar/layar-peta.png)"),
    "webp": fig("![Tampilan lapor](gambar/layar-lapor.webp)"),
    "skrip": fig("![x](gambar/jahat.svg)"),
    "warna": fig("![x](gambar/warna.svg)"),
    "hilang": fig("![x](gambar/tidak-ada.svg)"),
    "luar": fig("![x](https://contoh.id/a.png)"),
    "keluar": fig("![x](gambar/../../x.png)"),
    "tanpa_alt": fig("![](gambar/layar-peta.png)"),
    "dalam_paragraf": fig("kalimat dengan ![x](gambar/layar-peta.png) di tengah"),
    "sidik": sorted(bangun.sidik_gambar()),
}
print(json.dumps(hasil))
