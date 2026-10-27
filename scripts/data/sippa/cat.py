#!/usr/bin/env python3
"""SIPPA SP-090: cekungan air tanah (CAT) dan status zona konservasi (keputusan 56, DT 3.1.8, 7.2).

Masukan : data/kajian-bnpb/data/sippa/cat_daftar.csv (diisi dari lampiran Permen ESDM 2/2017 dan jawaban surat Badan Geologi, SP-067)
          kolom: cat_kode,nama,prov,zona_status,penurunan_tanah,sumber,tarik ; prov = kode 2 digit dipisah ';'
          baris komentar opsional `# lengkap: <n>` = Badan Geologi menyatakan daftar lengkap n CAT
Keluaran: data/sippa/keluaran/cat.json  ($SIPPA_KELUAR menimpa folder)
Pakai   : python3 scripts/data/sippa/cat.py   |   python3 scripts/data/sippa/cat.py uji
Python 3.12 stdlib. Tanpa poligon tebakan: `poligon` null sampai Badan Geologi mengirim geometri. Daftar kosong = keluaran sah
(baris [], n_cat null): zona_status hanya dari daftar tetap, tidak pernah ditebak.
"""
import csv
import io
import os
import re
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))  # append, bukan insert: `python3 -I` tidak memuat folder skrip
import bersama as bs  # noqa: E402

AKAR = Path(__file__).resolve().parents[3]
CSV = AKAR / "data" / "kajian-bnpb" / "data" / "sippa" / "cat_daftar.csv"
KELUAR = Path(os.environ.get("SIPPA_KELUAR") or AKAR / "data" / "sippa" / "keluaran")
KOLOM = ["cat_kode", "nama", "prov", "zona_status", "penurunan_tanah", "sumber", "tarik"]
ZONA_STATUS = ("aman", "rawan", "kritis", "rusak", "belum_ditetapkan")  # daftar tetap
YA = {"ya": True, "1": True, "true": True, "tidak": False, "0": False, "false": False}
TERLARANG = {"poligon", "geometri", "geom", "wkt", "geojson", "koordinat"}  # kolom geometri tanpa sumber ditolak


def baris_csv(teks):
    """Teks CSV -> (baris dict, n_lengkap atau None). Menolak kolom tak dikenal, baris tanpa sumber dan tarik, zona di luar daftar."""
    lengkap = None
    isi = []
    for g in teks.splitlines():
        m = re.fullmatch(r"#\s*lengkap:\s*(\d+)\s*", g)
        if m:
            lengkap = int(m.group(1))
        elif g.strip() and not g.startswith("#"):
            isi.append(g)
    if not isi:
        return [], lengkap
    rd = csv.DictReader(io.StringIO("\n".join(isi)))
    asing = set(rd.fieldnames or []) - set(KOLOM)
    if asing & TERLARANG:
        raise ValueError(f"geometri tanpa sumber ditolak: kolom {sorted(asing & TERLARANG)}; poligon tetap null sampai Badan Geologi mengirimnya")
    if asing or set(KOLOM) - set(rd.fieldnames or []):
        raise ValueError(f"kolom wajib {KOLOM}; ditemukan {rd.fieldnames}")
    baris, lihat = [], set()
    for no, r in enumerate(rd, start=2):
        ket = f"baris {no} ({r['cat_kode']})"
        kode = r["cat_kode"].strip()
        if not kode or kode in lihat:
            raise ValueError(f"{ket}: cat_kode kosong atau ganda")
        lihat.add(kode)
        if not r["nama"].strip():
            raise ValueError(f"{ket}: nama kosong")
        prov = [p.strip() for p in r["prov"].split(";")]
        if not all(re.fullmatch(r"\d{2}", p) for p in prov):
            raise ValueError(f"{ket}: prov '{r['prov']}' wajib kode 2 digit dipisah ;")
        if r["zona_status"].strip() not in ZONA_STATUS:
            raise ValueError(f"{ket}: zona_status '{r['zona_status']}' di luar daftar tetap {ZONA_STATUS}")
        if r["penurunan_tanah"].strip().lower() not in YA:
            raise ValueError(f"{ket}: penurunan_tanah '{r['penurunan_tanah']}' wajib ya atau tidak")
        if not r["sumber"].strip():
            raise ValueError(f"{ket}: tanpa sumber ditolak")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["tarik"].strip()):
            raise ValueError(f"{ket}: tarik '{r['tarik']}' wajib YYYY-MM-DD")
        baris.append({"cat_kode": kode, "nama": r["nama"].strip(), "prov": prov, "zona_status": r["zona_status"].strip(),
                      "penurunan_tanah": YA[r["penurunan_tanah"].strip().lower()], "sumber": r["sumber"].strip(), "tarik": r["tarik"].strip()})
    return baris, lengkap


def bangun(teks):
    baris, lengkap = baris_csv(teks)
    if lengkap is not None and lengkap != len(baris):
        raise ValueError(f"daftar dinyatakan lengkap {lengkap} CAT tetapi berisi {len(baris)}; n_cat tidak diisi")
    n_cat = {"nilai": lengkap, "keyakinan": "resmi"}  # null tanpa pernyataan lengkap
    sumber = [{"nama": "Badan Geologi, Kementerian ESDM: lampiran Permen ESDM 2/2017 dan jawaban surat (SP-067)", "lisensi": "data publik pemerintah",
               "tarik": max((b["tarik"] for b in baris), default="2026-10-26")}]
    return {**bs.kepala("2026-10-26", None, sumber,
                        "Daftar belum diterima dari Badan Geologi: zona_status belum ditetapkan dan poligon null. Tidak ada geometri atau status tebakan. "
                        "Penurunan muka tanah hanya dari sumber resmi.", "sippa_cat/1"),
            "keyakinan": "resmi", "n_cat": n_cat, "poligon": None, "baris": baris}


def tulis():
    doc = bangun(CSV.read_text(encoding="utf-8") if CSV.exists() else "")
    print("cat.json", bs.tulis_json(str(KELUAR / "cat.json"), doc), "byte", len(doc["baris"]), "CAT")


# ---------- self-check ----------
def _ditolak(teks, kata):
    try:
        bangun(teks)
    except ValueError as e:
        assert kata in str(e), f"pesan '{e}' tanpa '{kata}'"
        return
    raise AssertionError(f"harus ditolak ({kata}): {teks[:80]!r}")


def uji():
    kop = ",".join(KOLOM) + "\n"
    ok = kop + 'CAT-A,Contoh A,33;32,rawan,ya,Badan Geologi,2026-10-23\nCAT-B,Contoh B,62,belum_ditetapkan,tidak,Badan Geologi,2026-10-23\n'
    # (sampel uji, bukan data: nama fiktif)
    d = bangun(ok)
    assert [b["cat_kode"] for b in d["baris"]] == ["CAT-A", "CAT-B"] and d["baris"][0]["prov"] == ["33", "32"] and d["baris"][0]["penurunan_tanah"] is True
    assert d["n_cat"]["nilai"] is None and d["poligon"] is None, "n_cat null dan poligon null tanpa pernyataan lengkap"
    assert bangun(ok + "# lengkap: 2\n")["n_cat"]["nilai"] == 2
    # daftar kosong sah; tidak ada tebakan
    for kosong in ("", kop):
        e = bangun(kosong)
        assert e["baris"] == [] and e["n_cat"]["nilai"] is None and e["poligon"] is None
    # penolakan
    _ditolak(ok + "# lengkap: 3\n", "n_cat tidak diisi")
    _ditolak(kop + "CAT-A,A,33,rawan,ya,,2026-10-23\n", "tanpa sumber")
    _ditolak(kop + "CAT-A,A,33,rawan,ya,BG,23-10-2026\n", "tarik")
    _ditolak(kop + "CAT-A,A,33,genting,ya,BG,2026-10-23\n", "daftar tetap")
    _ditolak(kop + "CAT-A,A,3,rawan,ya,BG,2026-10-23\n", "kode 2 digit")
    _ditolak(kop + "CAT-A,A,33,rawan,mungkin,BG,2026-10-23\n", "ya atau tidak")
    _ditolak(kop + "CAT-A,A,33,rawan,ya,BG,2026-10-23\nCAT-A,B,33,rawan,ya,BG,2026-10-23\n", "ganda")
    _ditolak(ok.replace("tarik\n", "tarik,poligon\n").replace("2026-10-23\n", "2026-10-23,POLYGON((0 0))\n"), "geometri tanpa sumber")
    _ditolak("a,b\n1,2\n", "kolom wajib")
    # keluaran utuh dari berkas masukan nyata (kosong sampai data tiba, atau berisi bila staf sudah mengisi)
    nyata = bangun(CSV.read_text(encoding="utf-8") if CSV.exists() else "")
    assert bs.cek_keluaran(nyata, "cat") and list(nyata)[0] == "dibuat"
    assert all(b["sumber"] and b["tarik"] and b["zona_status"] in ZONA_STATUS for b in nyata["baris"])
    assert not list((AKAR / "public").rglob("cat.json")), "salinan di public/ dilarang"
    print(f"cat.py uji: OK ({len(nyata['baris'])} CAT di masukan nyata, n_cat {nyata['n_cat']['nilai']}, poligon null)")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif not sys.argv[1:]:
        tulis()
    else:
        sys.exit("pakai: cat.py [uji]")
