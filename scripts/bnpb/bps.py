"""#28 (#31) BPS WebAPI: klien kecil + pengurai. Kunci dari env `BPS_KEY` (daftar sendiri di webapi.bps.go.id; kode TIDAK membuat akun).

Tanpa kunci semua fungsi jaringan mengangkat KunciKosong; kerentanan.py menangkapnya dan menulis `bps.status = "MENUNGGU KUNCI"`.
Uji live: MENUNGGU KUNCI. Yang sudah teruji hanya pengurai terhadap fixture berformat dokumentasi WebAPI BPS dan balasan 401 asli
(diperiksa 29 Okt 2026: GET webapi.bps.go.id/v1/api/domain/type/kab/prov/33/key/x/ -> HTTP 401).

Format data yang diurai (dokumentasi WebAPI BPS "list/model/data"):
  {"status":"OK","data-availability":"available","var":[{"val":V,"label":..}],"turvar":[{"val":T}],"vervar":[{"val":3301,"label":"Cilacap"}],
   "tahun":[{"val":119,"label":"2019"}],"turtahun":[{"val":0}],"datacontent":{"<vervar><var><turvar><tahun><turtahun>": nilai}}
Kunci datacontent = penggabungan string kelima nilai itu. Bila format di lapangan beda, `urai_data` mengangkat FormatBeda, bukan
mengembalikan angka keliru. Variabel dicari dengan kata kunci (id variabel berbeda per domain dan tidak dikarang di sini).

Pakai:  BPS_KEY=... python3 scripts/bnpb/bps.py cari <domain> <kata>     (daftar variabel; domain provinsi = kode 2 digit + "00")
        python3 scripts/bnpb/bps.py --cek
"""
import os, re, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D

BASIS = "https://webapi.bps.go.id/v1/api"
JEDA = 1.5   # detik; kuota WebAPI per kunci tidak diumumkan, jadi pelan


class KunciKosong(RuntimeError):
    pass


class FormatBeda(RuntimeError):
    pass


def kunci():
    k = os.environ.get("BPS_KEY", "").strip()
    if not k:
        raise KunciKosong("BPS_KEY tidak ada di env")
    return k


def url_var(domain, kata, hal=1):
    return f"{BASIS}/list/model/var/domain/{domain}/keyword/{urllib.parse.quote(kata)}/page/{hal}/key/{kunci()}/"


def url_data(domain, var, tahun=None):
    t = f"/th/{tahun}" if tahun else ""
    return f"{BASIS}/list/model/data/domain/{domain}/var/{var}{t}/key/{kunci()}/"


def cari_var(domain, kata):
    """-> [(id, judul)] variabel BPS yang cocok dengan kata kunci."""
    r = D.ambil(url_var(domain, kata), jeda=JEDA)
    if r.get("status") != "OK" or r.get("data-availability") == "list-not-available":
        return []
    data = r.get("data") or []
    isi = data[1] if len(data) > 1 and isinstance(data[1], list) else data
    return [(x["var_id"], x["title"]) for x in isi if isinstance(x, dict) and "var_id" in x]


def pilih_var(daftar, pola):
    """Pilih id variabel pertama yang judulnya cocok pola regex (huruf besar-kecil diabaikan); None bila tak ada."""
    for vid, judul in daftar:
        if re.search(pola, judul, re.I):
            return vid
    return None


def urai_data(r, var=None):
    """Balasan list/model/data -> {kode vervar (str): {tahun label: nilai}} untuk variabel `var` (default: variabel tunggal).
    Mengangkat FormatBeda bila struktur tak sesuai."""
    if not isinstance(r, dict) or r.get("status") != "OK" or r.get("data-availability") != "available":
        raise FormatBeda(f"data tidak tersedia: {str(r)[:120]}")
    try:
        vv = [v["val"] for v in r["var"]]
        v = var if var is not None else (vv[0] if len(vv) == 1 else None)
        if v is None or v not in vv:
            raise FormatBeda(f"variabel {var} tak ada di balasan {vv}")
        turvar = [t["val"] for t in r["turvar"]] or [0]
        turtahun = [t["val"] for t in r["turtahun"]] or [0]
        out = {}
        for ver in r["vervar"]:
            for th in r["tahun"]:
                for tv in turvar:
                    for tt in turtahun:
                        n = r["datacontent"].get(f"{ver['val']}{v}{tv}{th['val']}{tt}")
                        if n is not None and n != "":
                            out.setdefault(str(ver["val"]), {})[th["label"]] = float(n)
        return out
    except (KeyError, TypeError, ValueError) as e:
        raise FormatBeda(f"struktur balasan tak dikenal: {e!r}")


def terbaru(per_tahun):
    """{tahun label: nilai} -> (tahun, nilai) tahun terbesar; None bila kosong."""
    if not per_tahun:
        return None
    t = max(per_tahun, key=lambda x: int(re.sub(r"\D", "", x) or 0))
    return t, per_tahun[t]


def _cek():
    fix = {"status": "OK", "data-availability": "available", "var": [{"val": 192, "label": "Persentase Penduduk Miskin"}],
           "turvar": [{"val": 0, "label": "-"}], "labelvervar": "Kabupaten/Kota",
           "vervar": [{"val": 3301, "label": "Cilacap"}, {"val": 3302, "label": "Banyumas"}],
           "tahun": [{"val": 123, "label": "2023"}, {"val": 124, "label": "2024"}], "turtahun": [{"val": 0, "label": "Tahun"}],
           "datacontent": {"330119201230": 10.6, "330119201240": 10.1, "330219201240": 11.9}}
    d = urai_data(fix)
    assert d == {"3301": {"2023": 10.6, "2024": 10.1}, "3302": {"2024": 11.9}}, d
    assert terbaru(d["3301"]) == ("2024", 10.1) and terbaru({}) is None
    for rusak in ({"status": "Error"}, {"status": "OK", "data-availability": "list-not-available"}, "bukan dict",
                  dict(fix, var=[{"val": 1}, {"val": 2}]), dict(fix, vervar=[{"x": 1}])):
        try:
            urai_data(rusak)
            raise AssertionError("format rusak harus ditolak")
        except FormatBeda:
            pass
    assert urai_data(dict(fix, var=[{"val": 192}, {"val": 7}]), var=192)["3301"]["2023"] == 10.6
    dl = [(10, "Jumlah Penduduk"), (192, "Persentase Penduduk Miskin (P0) Menurut Kabupaten/Kota"), (193, "Garis Kemiskinan")]
    assert pilih_var(dl, r"persentase penduduk miskin.*kabupaten") == 192 and pilih_var(dl, "tidak ada") is None
    saved = os.environ.pop("BPS_KEY", None)
    try:
        try:
            kunci()
            raise AssertionError("tanpa BPS_KEY harus KunciKosong")
        except KunciKosong:
            pass
        os.environ["BPS_KEY"] = "abc"
        assert url_data("3300", 192, 124) == f"{BASIS}/list/model/data/domain/3300/var/192/th/124/key/abc/"
        assert "keyword/penduduk%20miskin" in url_var("3300", "penduduk miskin")
    finally:
        os.environ.pop("BPS_KEY", None)
        if saved is not None:
            os.environ["BPS_KEY"] = saved
    print("bps: --cek hijau (uji live: MENUNGGU KUNCI)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--cek"]:
        _cek()
    elif len(a) == 3 and a[0] == "cari":
        for vid, judul in cari_var(a[1], a[2]):
            print(vid, judul)
    else:
        print(__doc__)
