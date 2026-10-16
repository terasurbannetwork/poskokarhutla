"""Gabung dokumen docs/multi-bencana/ jadi satu _gabung.md untuk artifact "Rencana Multi-Bencana".

Tautan antar-berkas (`[x](ALUR.md)`) tidak hidup di satu halaman, jadi diganti teks tebal; tautan
ber-jangkar (`ARSITEKTUR.md#judul`) jadi `#judul`. Jalankan: python3 docs/buku-pegangan/gabung.py
"""
import pathlib
import re

AKAR = pathlib.Path(__file__).parent.parent / "multi-bencana"
URUT = ["README", "RENCANA-20-JAM", "ARSITEKTUR", "PAKET-FITUR", "FASE-0", "ALUR", "SUMBER-DATA", "PETA",
        "PELATIHAN-MODEL", "COPYWRITING", "MODUL-PLUG-AND-PLAY"]
BENCANA = ["banjir", "gempa", "cuaca", "udara", "gunungapi", "kekeringan"]


def rapikan(teks):
    teks = re.sub(r"\[([^\]]+)\]\((?:\.\./)?(?:bencana/)?[\w.-]+\.md#([^)]+)\)", r"[\1](#\2)", teks)
    return re.sub(r"\[([^\]]+)\]\((?:\.\./)?(?:bencana/)?[\w./-]*\.md\)", r"**\1**", teks)


def gabung():
    berkas = [AKAR / f"{n}.md" for n in URUT] + [AKAR / "bencana" / f"{n}.md" for n in BENCANA]
    hilang = [str(b) for b in berkas if not b.exists()]
    if hilang:
        raise SystemExit("berkas hilang: " + ", ".join(hilang))
    isi = "\n\n---\n\n".join(rapikan(b.read_text(encoding="utf-8")).strip() for b in berkas)
    keluar = AKAR / "_gabung.md"
    keluar.write_text(isi + "\n", encoding="utf-8")
    return keluar, len(berkas)


if __name__ == "__main__":
    p, n = gabung()
    print(f"{p.name}: {n} berkas")
