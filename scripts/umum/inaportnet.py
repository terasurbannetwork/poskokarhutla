"""Inaportnet (Kemenhub): jumlah kunjungan kapal per pelabuhan per bulan, dalam dan luar negeri -> bahan jalur bantuan laut.
-> public/data/inaportnet.json   (3 bulan terakhir, ~260 pelabuhan; tanpa data kapal/orang)
Akses (diperiksa 10 Nov 2026, tanpa login/token): GET https://monitoring-inaportnet.dephub.go.id/list/<tahun>/<bulan> = sumber DataTables halaman publik beranda; JSON {data:[{kode_pelabuhan,nama_pelabuhan,dalam,luar,...}]}.
Hanya kode, nama, dua hitungan yang disimpan (sisanya potongan HTML tombol). Jeda 2 dtk.
Pakai: python3 scripts/umum/inaportnet.py   |   python3 scripts/umum/inaportnet.py uji
"""
import datetime as dt, importlib.util, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/inaportnet.json")
API = "https://monitoring-inaportnet.dephub.go.id/list/{y}/{m}"


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def bulan_mundur(hari, n):
    y, m = hari.year, hari.month
    out = []
    for _ in range(n):
        out.append((y, m))
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    return out[::-1]


def pelabuhan(data):
    """baris DataTables -> {kode: {nama, dalam, luar}} (angka saja)."""
    return {r["kode_pelabuhan"]: {"nama": r["nama_pelabuhan"], "dalam": int(r["dalam"] or 0), "luar": int(r["luar"] or 0)} for r in data}


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    bln, gagal = {}, []
    for y, m in bulan_mundur(dt.date.today(), 3):
        try:
            bln[f"{y}-{m:02d}"] = pelabuhan(J.ambil(API.format(y=y, m=m), jeda_host=2)["data"])
        except Exception as e:
            gagal.append(f"{y}-{m:02d}: {e}")
    nama = {k: v["nama"] for b in bln.values() for k, v in b.items()}
    simp(OUT, {"sumber": "Inaportnet monitoring (Ditjen Perhubungan Laut, Kemenhub)", "atribusi": "Kementerian Perhubungan, Inaportnet, https://monitoring-inaportnet.dephub.go.id",
               "lisensi": "Situs sumber tidak mencantumkan lisensi; halaman publik tanpa login, atribusi ke Kemenhub", "jenis_keluaran": "INDEKS (kunjungan kapal per pelabuhan per bulan; bukan model)",
               "diambil": dt.date.today().isoformat(), "gagal": gagal,
               "catatan": "dalam/luar = jumlah kunjungan kapal pelayaran dalam/luar negeri sebulan. Bulan berjalan belum penuh. Kode = UN/LOCODE pelabuhan. Tanpa koordinat: sambungan ke kab lewat nama/kode pelabuhan.",
               "pelabuhan": dict(sorted(nama.items())), "bulan": bln})
    print(f"inaportnet: {len(bln)} bulan, {len(nama)} pelabuhan, gagal {len(gagal)}")


def uji():
    assert bulan_mundur(dt.date(2026, 1, 5), 3) == [(2025, 11), (2025, 12), (2026, 1)]
    p = pelabuhan([{"kode_pelabuhan": "IDBLW", "nama_pelabuhan": "BELAWAN", "dalam": 62, "luar": 44, "detail": "<a>"}])
    assert p == {"IDBLW": {"nama": "BELAWAN", "dalam": 62, "luar": 44}}
    print("uji inaportnet: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
