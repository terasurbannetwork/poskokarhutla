"""Kejadian bencana SEMUA jenis, 365 hari terakhir, per baris kejadian dengan dampak (DIBI BNPB, Superset publik)
-> public/data/dibi_kejadian.json

Akses DIBI memakai superset() milik scripts/banjir/kejadian.py (dasbor publik 1, tanpa login; tidak resmi).
Kolom dampak DIBI (diperiksa Okt 2026 lewat kueri kolom): meninggal, hilang, luka_sakit, menderita, mengungsi,
rumah_rusak_berat/sedang/ringan, rumah_terendam, pendidikan_rusak, kantor_rusak, jembatan_rusak, fasum_rusak.
TIDAK ADA di DIBI: fasilitas peribadatan dan kesehatan (tidak dicantumkan, bukan 0).
Kolom dikelompokkan + SUM: baris kembar (hari, kab, jenis sama) tergabung dan `kejadian` = jumlahnya.

{"dibuat","sumber","dari","sampai","catatan","kolom":[...],"kejadian":[{tanggal,jenis,prov_kode,prov,kab_kode,kab,kejadian,<dampak>}]}

Pakai:  python3 scripts/umum/dibi_kejadian.py   |   python3 scripts/umum/dibi_kejadian.py uji
"""
import datetime as dt, importlib.util, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/dibi_kejadian.json")


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# kunci keluaran -> kolom DIBI
DAMPAK = {"meninggal": "meninggal", "hilang": "hilang", "luka": "luka_sakit", "terdampak": "menderita", "mengungsi": "mengungsi",
          "rr_berat": "rumah_rusak_berat", "rr_sedang": "rumah_rusak_sedang", "rr_ringan": "rumah_rusak_ringan",
          "terendam": "rumah_terendam", "f_pendidikan": "pendidikan_rusak", "f_kantor": "kantor_rusak",
          "jembatan": "jembatan_rusak", "f_umum": "fasum_rusak"}
TAK_ADA = ["f_ibadah", "f_kesehatan"]
NAMA_BERKAS_BANJIR = "scripts/banjir/kejadian.py"


def angka(v):
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return 0


def ubah(r, wib):
    """Satu baris kelompok DIBI -> kejadian (angka 0 dibuang per baris)."""
    k = angka(r.get("id_kab_bps"))
    kode = f"{k:04d}" if k else ""
    o = {"tanggal": dt.datetime.fromtimestamp(r["dt"] / 1000, wib).date().isoformat(), "jenis": str(r["jenis_bencana"]).strip(),
         "prov_kode": kode[:2], "prov": str(r.get("provinsi") or "").strip(),
         "kab_kode": f"{kode[:2]}.{kode[2:]}" if kode else None, "kab": str(r.get("kabupaten") or "").strip(),
         "kejadian": angka(r.get("jumlah_kejadian")) or 1}
    for kunci, kol in DAMPAK.items():
        if angka(r.get(kol)):
            o[kunci] = angka(r[kol])
    return o


def susun(baris, dari, sampai, wib):
    ada = [d for d in baris if dari <= d["tanggal"] <= sampai] if baris and "tanggal" in baris[0] else baris
    return sorted(ada, key=lambda x: (x["tanggal"], x["prov_kode"], x["kab_kode"] or "", x["jenis"]), reverse=True)


def jalan():
    K = _muat("banjir_kejadian", NAMA_BERKAS_BANJIR)
    umum_simpan = _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan
    wib = K.WIB
    hari = dt.datetime.now(wib).date()
    dari, sampai = (hari - dt.timedelta(days=365)).isoformat(), hari.isoformat()
    kol = ["dt", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"]
    met = [("jumlah_kejadian", "SUM(jumlah_kejadian)")] + [(c, f"SUM({c})") for c in DAMPAK.values()]
    baris = K.superset(kol, met, [{"col": "tahun", "op": "IN", "val": [hari.year - 1, hari.year]}], 50000)
    if len(baris) >= 50000:
        raise RuntimeError("DIBI: batas 50.000 baris tercapai, data terpotong")
    kej = susun([ubah(r, wib) for r in baris if r.get("dt")], dari, sampai, wib)
    kolom = [k for k in DAMPAK if any(k in x for x in kej)]
    umum_simpan(KELUAR, {
        "sumber": "DIBI BNPB (dibi.bnpb.go.id, Superset dasbor publik)", "dari": dari, "sampai": sampai,
        "catatan": "Semua jenis bencana, per kabupaten per hari; baris kembar (hari, kabupaten, jenis sama) digabung dan 'kejadian' = jumlahnya. "
                   "Angka 0 dihilangkan per baris (kunci tak ada = 0). terdampak = kolom DIBI 'menderita'; luka = 'luka_sakit'; "
                   "f_umum = fasilitas umum rusak (kolom tambahan DIBI). Fasilitas peribadatan dan kesehatan TIDAK ADA di DIBI "
                   "sehingga tidak dicantumkan (bukan 0). DIBI tidak resmi lewat API dan sering diperbarui susulan.",
        "kolom": kolom, "kejadian": kej})
    print(f"dibi_kejadian: {len(kej)} kejadian {dari}..{sampai}, kolom {kolom}")


def uji():
    wib = dt.timezone(dt.timedelta(hours=7))
    r = {"dt": 1772204400628.0, "provinsi": "DI Yogyakarta ", "kabupaten": "Bantul", "id_kab_bps": 3402, "jenis_bencana": "Gerakan Tanah ",
         "jumlah_kejadian": 2.0, "meninggal": 1, "hilang": 0, "luka_sakit": 3.0, "rumah_terendam": 0}
    o = ubah(r, wib)
    assert o["prov_kode"] == "34" and o["kab_kode"] == "34.02" and o["jenis"] == "Gerakan Tanah" and o["prov"] == "DI Yogyakarta"
    assert o["kejadian"] == 2 and o["meninggal"] == 1 and o["luka"] == 3 and "hilang" not in o and "terendam" not in o
    assert o["tanggal"] == "2026-02-27", o["tanggal"]
    a, b, c = dict(o, tanggal="2026-01-01"), dict(o, tanggal="2026-03-01"), dict(o, tanggal="2020-01-01")
    s = susun([a, b, c], "2025-10-28", "2026-10-28", wib)
    assert [x["tanggal"] for x in s] == ["2026-03-01", "2026-01-01"]
    assert angka(None) == 0 and angka("x") == 0
    print("uji dibi_kejadian: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
