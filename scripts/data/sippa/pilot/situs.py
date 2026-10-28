"""Renlap Generator (SP-140): daftar kompleks -> situs. Titik petak, sumber air, dan rute ditentukan analisis.py dari data
(kelayakan_kompleks.json, akses_kompleks.json, titik panas live); modul ini hanya memeriksa dan memberi nomor.
Self-check tanpa jaringan: python3 situs.py"""
import re

MAKS = 10


def norm_id(x):
    """'166', 'K166', 'k0166' -> 'K0166'"""
    m = re.fullmatch(r"[Kk]?\s*(\d{1,5})", str(x).strip())
    if not m:
        raise ValueError(f"id kompleks tidak dikenal: {x!r} (contoh K0166)")
    return f"K{int(m.group(1)):04d}"


def parse_ids(teks):
    """'K0166, 9321 K7357' -> ['K0166', 'K9321', 'K7357'] (urutan dipertahankan, ganda dibuang, paling banyak MAKS)"""
    ids = []
    for t in re.split(r"[,;\s]+", str(teks).strip()):
        if t and norm_id(t) not in ids:
            ids.append(norm_id(t))
    if not ids:
        raise ValueError("daftar kompleks kosong")
    if len(ids) > MAKS:
        raise ValueError(f"paling banyak {MAKS} kompleks per renlap, diberi {len(ids)}")
    return ids


def bangun(ids, kel, aks):
    """kel, aks: dict id -> baris kelayakan/akses. Kembalikan daftar situs seperti kumpul.SITUS (tanpa 'paksa')."""
    hilang = [i for i in ids if i not in kel]
    if hilang:
        raise ValueError("kompleks tidak ada di data SIPPA: " + ", ".join(hilang))
    tanpa = [i for i in ids if i not in aks]
    if tanpa:      # kompleks tanpa entri akses_kompleks.json (rute, posko, titik air belum dihitung)
        raise ValueError("kompleks belum punya data akses SIPPA (rute, posko, titik air): " + ", ".join(tanpa))
    return [dict(no=n, id=i, nama="", peran="RENLAP") for n, i in enumerate(ids, 1)]


def uji():
    assert norm_id("166") == "K0166" and norm_id("k0166") == "K0166" and norm_id(" K9321 ") == "K9321"
    assert parse_ids("K0166, 9321 K7357;166") == ["K0166", "K9321", "K7357"]
    for buruk in ("", "abc", ",".join(str(i) for i in range(1, 12)), "K123456"):
        try:
            parse_ids(buruk)
        except ValueError:
            continue
        raise AssertionError("harus ditolak: " + buruk)
    s = bangun(["K0001", "K0002"], {"K0001": {}, "K0002": {}}, {"K0001": {}, "K0002": {}})
    assert [x["no"] for x in s] == [1, 2] and s[1]["id"] == "K0002" and "paksa" not in s[0]
    try:
        bangun(["K0003"], {}, {})
    except ValueError:
        pass
    else:
        raise AssertionError("id tak dikenal harus ditolak")
    print("situs uji ok")


if __name__ == "__main__":
    uji()
