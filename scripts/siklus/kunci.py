"""Kunci wilayah tunggal Siklus: apa pun -> kode Kemendagri kabupaten 4 digit (kab4, = IRBI, bukan BPS), lewat kab_kunci dan hvc_dasar.kab_kode.

Konvensi masukan: '32|Bogor' (kunci peta), nama bebas + provinsi, atau kode 4 digit (3201, '32.01') HANYA bila pemanggil menyatakan
kemendagri=True. Kode tanpa pernyataan, apalagi id_kab_bps DIBI (BPS, beda di 164 kabupaten), ditolak: lewat nama dan provinsi.
Tidak terpetakan -> None dan dihitung (`petakan`), tidak pernah dibuang diam-diam.
Pakai: python3 -I scripts/siklus/kunci.py uji
"""
import importlib.util, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


_KK = _muat("bnpb_kunci_kejadian", "scripts/bnpb/kunci_kejadian.py")
_KODE = _muat("bnpb_hvc_dasar", "scripts/bnpb/hvc_dasar.py").kab_kode()
SAH = frozenset(_KODE.values())


def kab4(masukan, prov=None, kemendagri=False):
    """-> kode Kemendagri '3201' atau None. Masukan angka 4 digit dianggap Kemendagri hanya bila kemendagri=True."""
    if masukan is None:
        return None
    s = str(masukan).strip()
    if re.fullmatch(r"\d{2}\.\d{2}", s):
        s = s.replace(".", "")
        if not kemendagri:
            return None
    if re.fullmatch(r"\d{4}", s):
        return s if kemendagri and s in SAH else None
    if "|" in s:
        return _KODE.get(s)
    k = _KK.kab_kunci(s, prov)
    return _KODE.get(k) if k else None


def petakan(daftar, kemendagri=False):
    """daftar of (masukan, prov) atau masukan -> (list kode|None, kab_tak_terpetakan)."""
    hasil = [kab4(*x, kemendagri=kemendagri) if isinstance(x, tuple) else kab4(x, kemendagri=kemendagri) for x in daftar]
    return hasil, sum(1 for h in hasil if h is None)


def _uji():
    K = lambda *a: kab4(*a, kemendagri=True)
    assert kab4("32|Bogor") == "3201" == K("3201") == K(3201) == K("32.01")
    assert kab4("3201") is None and kab4(3201) is None and kab4("32.01") is None, "kode tanpa pernyataan Kemendagri ditolak"
    assert kab4("33|Cilacap") == "3301" == kab4("Cilacap", "33")
    assert kab4("Kota Bogor", "32") == "3271" and kab4("Kab. Bogor", "32") == "3201"
    assert kab4("Mimika", "91") == "9404" == kab4("94|Mimika"), "provinsi lama Papua memetakan lewat nama tunggal"
    assert kab4("Aceh Besar", "11") == "1106", "Kemendagri, bukan BPS 1108"
    assert kab4("Bintan", "21") == "2101" and kab4("Kota Administrasi Jakarta Selatan", "31") == "3174"
    for salah in ("9999", "99.99", "32|Atlantis", "Atlantis", "", None, "abc1"):
        assert K(salah) is None, salah
    hasil, tak = petakan([("3201"), "32.01", ("Atlantis", "32"), "32|Bogor", "9999"], kemendagri=True)
    assert hasil == ["3201", "3201", None, "3201", None] and tak == 2
    print("kunci: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: kunci.py uji")
