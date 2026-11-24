"""Indeks MJO (RMM harian) -> public/data/mjo.json + public/data/mjo_arsip.json (H21, ALGORITMA A5).

Sumber: BoM, indeks RMM "rmm.74toRealtime.txt". URL lama /climate/mjo/graphics/ MASIH menjawab 200 tetapi BEKU di 24 Feb 2024
(last-modified Feb 2024); URL hidup per 24 Nov 2026: https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt (http 301 ke https).
Kolom: tahun bulan hari RMM1 RMM2 fase amplitudo metode. Nilai hilang: fase 999 / angka >= 1E30.

Aturan jeda (PRAREG-MJO): nilai untuk hari D hanya boleh dipakai bila sudah TERBIT pada D-1. Terbit terakhir biasanya H-2 (diukur 24 Nov 2026:
data 22 Nov, diambil 24 Nov). Arsip append-only per tanggal ambil (WIB): `tersedia(arsip, D)` hanya membaca potret dengan kunci <= D-1,
jadi revisi nilai lama (BoM mengganti metode/hitung ulang beberapa hari terakhir) tidak bocor ke uji. Entri arsip tidak pernah ditimpa.

Pakai:  python3 scripts/cuaca/mjo.py        |  python3 scripts/cuaca/mjo.py uji  (tanpa jaringan, memakai fixture/mjo_rmm.txt)
"""
import datetime as dt
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, WIB, baca, simpan  # noqa: E402

URL = "https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KELUAR = os.path.join(AKAR, "public/data/mjo.json")
ARSIP = os.path.join(AKAR, "public/data/mjo_arsip.json")
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture/mjo_rmm.txt")
HARI = 90          # jendela keluaran
SIMPAN_ARSIP = 14  # hari terakhir yang dipotret per ambil (cukup untuk menangkap revisi)
AMBANG_AKTIF = 1.0
LAG_TERBIT = 3     # hari: nilai bertanggal D hanya dipakai dari D+3 (= PRAREG-MJO bag. 4: D-1 dikurangi jeda 2, tanggal <= D-3)


def urai(teks):
    """Teks BoM -> daftar {tanggal, rmm1, rmm2, fase, amplitudo} urut naik; baris hilang dibuang."""
    out = []
    for b in teks.splitlines():
        p = b.split()
        if len(p) < 7 or not p[0].isdigit():
            continue
        try:
            y, m, d = int(p[0]), int(p[1]), int(p[2])
            r1, r2, ph, am = float(p[3]), float(p[4]), int(p[5]), float(p[6])
            tgl = dt.date(y, m, d).isoformat()
        except ValueError:
            continue
        if ph == 999 or max(abs(r1), abs(r2), abs(am)) >= 1e30 or not 1 <= ph <= 8:
            continue
        out.append({"tanggal": tgl, "rmm1": round(r1, 3), "rmm2": round(r2, 3), "fase": ph, "amplitudo": round(am, 3)})
    out.sort(key=lambda r: r["tanggal"])
    return out


def unduh():
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(8_000_000).decode("utf-8", "replace")


def bangun(deret, hari_ini):
    """deret (urai) + tanggal ambil (date WIB) -> isi mjo.json. Tanpa data = ValueError."""
    if not deret:
        raise ValueError("deret MJO kosong")
    akhir = dt.date.fromisoformat(deret[-1]["tanggal"])
    jeda = (hari_ini - akhir).days
    if jeda < 0 or jeda > 10:
        raise ValueError(f"data MJO terakhir {akhir} janggal terhadap hari ambil {hari_ini} (jeda {jeda} hari)")
    awal = (akhir - dt.timedelta(days=HARI - 1)).isoformat()
    jendela = [{**r, "aktif": r["amplitudo"] >= AMBANG_AKTIF} for r in deret if r["tanggal"] >= awal]
    t = jendela[-1]
    return {
        "sumber": "BoM RMM (Wheeler-Hendon), " + URL, "diambil": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "tanggal_terakhir": t["tanggal"], "jeda_terbit_hari": jeda, "ambang_aktif": AMBANG_AKTIF,
        "aktif": t["amplitudo"] >= AMBANG_AKTIF, "fase": t["fase"], "amplitudo": t["amplitudo"],
        "catatan_jeda": "nilai hari D boleh dipakai hanya bila terbit pada D-1; lihat mjo_arsip.json dan tersedia()",
        "deret": jendela,
    }


def tambah_arsip(arsip, hari_ini, deret):
    """Append-only: kunci = tanggal ambil WIB. Kunci yang sudah ada TIDAK ditimpa. Mengembalikan True bila entri baru ditulis."""
    k = hari_ini.isoformat()
    if k in arsip:
        return False
    arsip[k] = {"tanggal_terakhir": deret[-1]["tanggal"],
                "nilai": [[r["tanggal"], r["rmm1"], r["rmm2"], r["fase"], r["amplitudo"]] for r in deret[-SIMPAN_ARSIP:]]}
    return True


def tersedia(arsip, hari):
    """{tanggal: [rmm1,rmm2,fase,amp]} yang sudah diketahui pada D-1 untuk hari D (ISO): potret terbaru berkunci <= D-1."""
    batas = (dt.date.fromisoformat(hari) - dt.timedelta(days=1)).isoformat()
    ks = [k for k in arsip if k <= batas]
    if not ks:
        return {}
    return {n[0]: n[1:] for n in arsip[max(ks)]["nilai"]}


def pilih_arsip(arsip, hari):
    """Nilai arsip yang BOLEH dipakai untuk hari D (ISO): bertanggal <= D-LAG_TERBIT, dari potret berkunci <= D-1 (lewat tersedia()).

    Aturan D-3 PRAREG-MJO hidup di sini sebagai kode, bukan hanya prosa; kode uji/latih wajib memakai fungsi ini.
    Catatan: jeda terbit DIUKUR SEKALI (24 Nov 2026: data 22 Nov, 2 hari) dan uji() menunjukkan bisa 3 hari (tanpa nilai 22 Nov, jeda 3).
    Ukur ulang dari mjo_arsip.json setelah beberapa pekan (selisih kunci potret vs tanggal_terakhir); naikkan LAG_TERBIT bila perlu.
    """
    batas = (dt.date.fromisoformat(hari) - dt.timedelta(days=LAG_TERBIT)).isoformat()
    return {t: v for t, v in tersedia(arsip, hari).items() if t <= batas}


def uji():
    teks = open(FIXTURE, encoding="utf-8").read()
    d = urai(teks)
    assert d and d[-1]["tanggal"] == "2026-11-22", d[-1]
    assert d[-1]["fase"] == 4 and abs(d[-1]["amplitudo"] - 1.1345) < 1e-3
    assert len(d) > 100 and all(1 <= r["fase"] <= 8 for r in d)
    assert urai(" 1978 12 31 9.99999962E+35 9.99999962E+35 999 9.99999962E+35 Mi") == []   # nilai hilang dibuang
    o = bangun(d, dt.date(2026, 11, 24))
    assert o["jeda_terbit_hari"] == 2 and o["aktif"] is True and len(o["deret"]) == HARI, o["jeda_terbit_hari"]
    assert o["deret"][-1]["aktif"] and bangun(d[:-1], dt.date(2026, 11, 24))["jeda_terbit_hari"] == 3
    try:
        bangun(d, dt.date(2026, 12, 20)); assert False
    except ValueError:
        pass
    # arsip: append-only dan aturan D-1
    ar = {}
    assert tambah_arsip(ar, dt.date(2026, 11, 24), d)
    assert not tambah_arsip(ar, dt.date(2026, 11, 24), d[:-5]) and ar["2026-11-24"]["tanggal_terakhir"] == "2026-11-22"
    assert tersedia(ar, "2026-11-24") == {} and tersedia(ar, "2026-11-25")["2026-11-22"][2] == 4
    assert max(pilih_arsip(ar, "2026-11-26")) == "2026-11-22" and pilih_arsip(ar, "2026-11-24") == {}
    ar2 = {"2026-11-25": {"tanggal_terakhir": "2026-11-24", "nilai": [["2026-11-22", 1, 1, 4, 1.1], ["2026-11-23", 1, 1, 4, 1.1], ["2026-11-24", 1, 1, 4, 1.1]]}}
    for hari_d in ("2026-11-26", "2026-11-27", "2026-11-30"):   # nilai bertanggal D-2 TIDAK PERNAH keluar
        d2 = (dt.date.fromisoformat(hari_d) - dt.timedelta(days=2)).isoformat()
        assert d2 not in pilih_arsip(ar2, hari_d), (hari_d, d2)
    print(f"uji MJO lulus: {len(d)} hari, terakhir {d[-1]['tanggal']} fase {d[-1]['fase']} amp {d[-1]['amplitudo']}, jeda {o['jeda_terbit_hari']} hari")


def main():
    hari_ini = dt.datetime.now(WIB).date()
    deret = urai(unduh())
    o = bangun(deret, hari_ini)
    arsip = baca(ARSIP, {}) or {}
    baru = tambah_arsip(arsip, hari_ini, deret)
    simpan(KELUAR, o)
    if baru:
        simpan(ARSIP, arsip)
    print(f"mjo: {o['tanggal_terakhir']} fase {o['fase']} amp {o['amplitudo']} aktif={o['aktif']} jeda {o['jeda_terbit_hari']} hari; arsip {'+1' if baru else 'tetap'} ({len(arsip)})")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
