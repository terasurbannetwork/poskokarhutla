"""Sisipkan tautan "Tentang kami" ke menu bencana (header) public/index.html dan public/banjir/index.html.

Halaman ini juga disunting sesi lain, jadi tidak diedit tangan: jangkar harus cocok TEPAT sekali, kalau tidak skrip berhenti
tanpa menulis apa pun. Idempoten: berkas yang sudah memuat penanda dilewati. Jalankan: python3 scripts/situs/sisip_tentang.py
"""
import pathlib
import sys

PUB = pathlib.Path(__file__).resolve().parents[2] / "public"
JANGKAR = '</div></details>\n  </div>\n  <nav class="tabs"'
PENANDA = "<!--tentang-->"
TAUTAN = (PENANDA + '<hr style="border:0;border-top:1px solid var(--line);margin:4px 6px">'
          '<a href="/tentang"><svg class="bc-ik" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" '
          'stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>Tentang kami</a>')


def sisip(teks):
    if PENANDA in teks:
        return None
    n = teks.count(JANGKAR)
    if n != 1:
        raise SystemExit(f"jangkar menu bencana ditemukan {n} kali (harus 1); tidak ada yang ditulis")
    return teks.replace(JANGKAR, TAUTAN + JANGKAR)


def main():
    for rel in ["index.html", "banjir/index.html"]:
        p = PUB / rel
        baru = sisip(p.read_text())
        if baru is None:
            print(f"{rel}: sudah ada, dilewati")
            continue
        p.write_text(baru)
        print(f"{rel}: tautan Tentang disisipkan")


def uji():
    contoh = "<div class=menu><a>x</a>" + JANGKAR + ">"
    hasil = sisip(contoh)
    assert hasil.count("/tentang") == 1 and hasil.endswith(JANGKAR + ">")
    assert sisip(hasil) is None, "harus idempoten"
    try:
        sisip(contoh + JANGKAR)
        raise AssertionError("jangkar ganda harus ditolak")
    except SystemExit:
        pass
    print("uji sisip_tentang: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
