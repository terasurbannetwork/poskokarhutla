"""KEU-1 Penguji konsistensi angka LAKIP dan LK (DESAIN-TEKNIS sec 5.13; riset/6 K1; tiket RU-056).

Skrip LOKAL pemilik (U9). Bukan langkah jalan.py: tidak menulis ke repo, R2, atau D1. Hasil markdown ke stdout:
  python3 -I scripts/bnpb/unit/keu1.py <draf.pdf> > <di luar repo>/selisih.md
Draf di dalam repo ditolak kecuali di jalur yang di-ignore git (data/raw/), supaya draf internal tidak pernah ter-commit.

Aturan (riset/6 K1):
  (a) jumlah baris = total: baris bernomor satu tingkat (1, 2, ...) dijumlah lalu dibanding baris Jumlah/Total di tabel yang sama
  (b) persen dihitung ulang dari pagu dan realisasi; selisih > 0,01 poin ditandai
  (c) angka yang sama (label dan kolom sama, basis sama) di dua tempat harus identik
  (d) persen realisasi wajib menyebut basisnya (pagu total atau pagu efektif); tanpa itu "basis tidak disebut"
Pembacaan tabel dari pdftotext -layout bersifat heuristik: baris yang tak terbaca tidak diuji (dilaporkan jumlahnya).

  python3 -I scripts/bnpb/unit/keu1.py --cek   (kasus: selisih yang tercatat di data/kajian-bnpb/pustaka/5-lakip.md)
"""
import os
import re
import subprocess
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TOLERANSI = 0.01   # poin persen (riset/6 K1)
_ANGKA = r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+"
_RE_ANGKA = re.compile(rf"(?<![\w.,])({_ANGKA})(\s*%)?(?![\w])")
_RE_BASIS = re.compile(r"(?i)pagu\s+(total|efektif)|tanpa\s+blokir|dengan\s+blokir")
_RE_TOTAL = re.compile(r"(?i)^\s*(jumlah|total)\b")
_RE_NOMOR = re.compile(r"^\s*(\d+(?:\.\d+)*)\.?\s+(\S.*)$")


def angka_id(s):
    """'4.912.096.039.000' -> 4912096039000; '90,97' -> 90.97; '7' -> 7."""
    s = s.strip()
    return float(s.replace(".", "").replace(",", ".")) if "," in s else int(s.replace(".", ""))


def fmt(x, d=2):
    if isinstance(x, int):
        return f"{x:,}".replace(",", ".")
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def norm(label):
    return re.sub(r"\s+", " ", re.sub(r"^\s*\d+(?:\.\d+)*\.?\s+", "", label)).strip(" .:*").lower()


def basis(teks):
    m = _RE_BASIS.search(teks or "")
    if not m:
        return None
    return "efektif" if re.search(r"(?i)efektif|tanpa\s+blokir", m.group(0)) else "total"


# ------------------------------------------------------------ aturan (murni, atas baris terstruktur)
# baris = {hal, tabel, label, pagu, realisasi, persen, basis}; kosong = None
def cek_persen(baris):
    """(b) persen tertulis lawan realisasi/pagu x 100."""
    out = []
    for b in baris:
        if b.get("pagu") and b.get("realisasi") is not None and b.get("persen") is not None:
            h = round(b["realisasi"] / b["pagu"] * 100, 2)
            if abs(h - b["persen"]) > TOLERANSI:
                out.append({"aturan": "b", "hal": b["hal"], "label": b["label"],
                            "isi": f"tertulis {fmt(b['persen'])}%, hitung ulang {fmt(b['realisasi'])} / {fmt(b['pagu'])} = {fmt(h)}%"})
    return out


def cek_jumlah(baris):
    """(a) baris bernomor tingkat satu dijumlah lawan baris Jumlah/Total di tabel yang sama, per kolom pagu dan realisasi."""
    out, per = [], {}
    for b in baris:
        per.setdefault((b["hal"], b.get("tabel")), []).append(b)
    for (hal, tabel), bs in per.items():
        tot = next((b for b in bs if _RE_TOTAL.match(b["label"])), None)
        atas = [b for b in bs if re.match(r"^\s*\d+\.?\s", b["label"]) and not re.match(r"^\s*\d+\.\d", b["label"])]
        if not tot or len(atas) < 2:
            continue
        for k in ("pagu", "realisasi"):
            if tot.get(k) is None or any(b.get(k) is None for b in atas):
                continue
            s = sum(b[k] for b in atas)
            if s != tot[k]:
                out.append({"aturan": "a", "hal": hal, "label": tot["label"],
                            "isi": f"{k}: jumlah {len(atas)} baris = {fmt(s)}, tertulis {fmt(tot[k])} (selisih {fmt(tot[k] - s)})"})
    return out


def cek_sama(baris):
    """(c) label dan kolom sama dengan basis sama (atau basis sama-sama tidak disebut) harus bernilai identik."""
    out, per = [], {}
    for b in baris:
        for k in ("pagu", "realisasi", "persen", "nilai"):
            if b.get(k) is not None:
                per.setdefault((norm(b["label"]), k, b.get("basis")), []).append(b)
    for (lab, k, bs_), bs in sorted(per.items(), key=lambda x: (x[0][0], x[0][1], str(x[0][2]))):
        nilai = sorted({b[k] for b in bs})
        if len(nilai) > 1:
            tempat = "; ".join(f"{fmt(b[k])} (hal. {b['hal']})" for b in bs)
            out.append({"aturan": "c", "hal": bs[0]["hal"], "label": bs[0]["label"], "isi": f"{k} beda antartempat: {tempat}"})
    return out


def cek_basis(kalimat):
    """(d) kalimat = [{hal, teks}] berisi persen realisasi; tanpa penyebut basis ditandai."""
    out = []
    for k in kalimat:
        if re.search(r"(?i)realisasi|penyerapan", k["teks"]) and re.search(r"\d,\d+\s*%", k["teks"]) and basis(k["teks"]) is None:
            out.append({"aturan": "d", "hal": k["hal"], "label": "persen realisasi", "isi": f"basis tidak disebut: \"{k['teks'].strip()[:140]}\""})
    return out


def uji(baris, kalimat):
    return cek_jumlah(baris) + cek_persen(baris) + cek_sama(baris) + cek_basis(kalimat)


# ------------------------------------------------------------ pembaca PDF
def halaman_pdf(jalur):
    r = subprocess.run(["pdftotext", "-layout", jalur, "-"], capture_output=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"pdftotext gagal (kode {r.returncode})")
    return r.stdout.decode("utf-8", "replace").split("\f")


def baca(halaman):
    """Teks per halaman -> (baris tabel, kalimat persen, tak_terbaca). Baris tabel = label + 2 angka besar (pagu, realisasi) + persen opsional."""
    baris, kalimat, tak = [], [], 0
    for i, t in enumerate(halaman, 1):
        b_hal = basis(t)
        tabel = 0
        for ln in t.splitlines():
            if re.search(r"(?i)^\s*tabel\s+\d", ln):
                tabel += 1
            ang = [(m.group(1), bool(m.group(2)), m.start()) for m in _RE_ANGKA.finditer(ln)]
            besar_m = [(a, pos) for a, p, pos in ang if not p and "." in a and len(a) >= 9]
            besar = [angka_id(a) for a, _ in besar_m]
            pers = [angka_id(a) for a, p, _ in ang if p]
            if len(besar) >= 2:
                label = ln[:besar_m[0][1]].strip()
                if not label:
                    tak += 1
                    continue
                baris.append({"hal": i, "tabel": tabel, "label": label, "pagu": besar[0], "realisasi": besar[1],
                              "persen": float(pers[-1]) if pers else None, "basis": b_hal})
            elif pers and not besar:
                kalimat.append({"hal": i, "teks": ln})
    return baris, kalimat, tak


def laporan(sel, judul, tak=0):
    nama = {"a": "Jumlah baris lawan total", "b": "Persen dihitung ulang", "c": "Angka sama beda tempat", "d": "Basis persen"}
    out = [f"# Selisih angka {judul}", "", f"{len(sel)} selisih. Baris tabel tak terbaca (tidak diuji): {tak}.", ""]
    for a in "abcd":
        s = [x for x in sel if x["aturan"] == a]
        out += [f"## ({a}) {nama[a]}: {len(s)}", ""] + [f"- hal. {x['hal']}, {x['label']}: {x['isi']}" for x in s] + [""]
    return "\n".join(out)


def _di_repo_terlacak(jalur):
    p = os.path.realpath(jalur)
    if not p.startswith(os.path.realpath(AKAR) + os.sep):
        return False
    return subprocess.run(["git", "-C", AKAR, "check-ignore", "-q", p]).returncode != 0


# ------------------------------------------------------------ self-check
def _kasus_lakip():
    """Selisih tercatat di 5-lakip.md (bagian 4 dan 7), diketik ulang sebagai baris; hal. sesuai catatan."""
    B = lambda hal, label, **k: {"hal": hal, "tabel": k.pop("tabel", 1), "label": label, "basis": k.pop("basis", "total"), **k}
    baris = [
        # 4.7 Lampiran 10: Biro Keuangan 137,2 / 143,4 (miliar) tertulis 72,34% (RU sec 9 butir 5: hitung ulang 95,68%)
        B("132", "Biro Keuangan", pagu=143.4, realisasi=137.2, persen=72.34),
        # 4.2 Tabel 3.19 lawan teks/Tabel 3.23: Ketahanan Bencana 91,27% lawan 91,22%; hitung ulang 91,22%
        B("99", "2 Program Ketahanan Bencana", pagu=4602995058000, realisasi=4198821988323, persen=91.27),
        B("101", "Ketahanan Bencana", tabel=2, pagu=4602995058000, realisasi=4198821988323, persen=91.22),
        # 7 butir 5: pagu Dukungan Manajemen
        B("17", "Program Dukungan Manajemen", tabel=0, pagu=309068219000),
        B("99", "1 Program Dukungan Manajemen", pagu=309100981000, realisasi=269951163994, persen=87.33),
        # 7 butir 6: realisasi Ketahanan Bencana Tabel 3.19 lawan Lampiran 10
        B("132", "Program Ketahanan Bencana", tabel=2, realisasi=4201208738348),
        # 4.4: realisasi belanja Barang tabel lawan Ringkasan Eksekutif
        B("100", "Barang", pagu=964541615000, realisasi=553711995689),
        B("xii", "Barang", tabel=0, realisasi=553711955689),
        # 7 butir 1 dan 4: IRB 2025 teks lawan rumus; target RB tiga angka
        B("19", "IRB 2025", tabel=0, basis=None, nilai=170.17), B("19", "IRB 2025", tabel=1, basis=None, nilai=170.19),
        B("72", "Target RB 2025", tabel=0, basis=None, nilai=77.18), B("72", "Target RB 2025", tabel=1, basis=None, nilai=75.05),
        B("14", "Target RB 2025", tabel=0, basis=None, nilai=75.01),
        # pagu efektif (Tabel 3.21) beda basis: TIDAK boleh ditandai (c) lawan pagu total
        B("100", "Program Dukungan Manajemen", tabel=3, basis="efektif", pagu=271501998000, realisasi=269951163994, persen=99.43),
    ]
    kalimat = [{"hal": "101", "teks": "realisasi sebesar 90,97% dan 99,90%"},   # 7 butir 7: dua basis tanpa disebut
               {"hal": "xi", "teks": "realisasi 99,90% dari pagu efektif"}]
    return baris, kalimat


def cek():
    assert angka_id("4.912.096.039.000") == 4912096039000 and angka_id("90,97") == 90.97 and angka_id("143,4") == 143.4
    assert fmt(4912096039000) == "4.912.096.039.000" and fmt(95.6764) == "95,68"
    baris, kalimat = _kasus_lakip()
    sel = uji(baris, kalimat)
    teks = [f"{x['aturan']}|{x['hal']}|{x['label']}|{x['isi']}" for x in sel]
    harap = [
        ("b", "Biro Keuangan", "tertulis 72,34%, hitung ulang 137,20 / 143,40 = 95,68%"),
        ("b", "Program Ketahanan Bencana", "tertulis 91,27%, hitung ulang"),
        ("c", "Program Dukungan Manajemen", "309.068.219.000 (hal. 17); 309.100.981.000 (hal. 99)"),
        ("c", "Program Ketahanan Bencana", "4.198.821.988.323 (hal. 99); 4.201.208.738.348 (hal. 132)"),
        ("c", "Barang", "553.711.995.689 (hal. 100); 553.711.955.689 (hal. xii)"),
        ("c", "IRB 2025", "170,17 (hal. 19); 170,19 (hal. 19)"),
        ("c", "Target RB 2025", "77,18 (hal. 72); 75,05 (hal. 72); 75,01 (hal. 14)"),
        ("d", "persen realisasi", "basis tidak disebut"),
    ]
    for a, lab, isi in harap:
        assert any(t.startswith(a + "|") and lab in t and isi in t for t in teks), f"selisih tidak tertangkap: {a} {lab} {isi}\n" + "\n".join(teks)
    assert len(sel) == len(harap), "\n".join(teks)   # pagu efektif 271.501.998.000 tidak ditandai lawan pagu total; 99,90% ber-basis tidak ditandai
    # (a) jumlah baris lawan total, dari teks pdftotext -layout tiruan (Tabel 3.19 hal. 99)
    hal = ["Tabel 3.19 Realisasi terhadap pagu total\n"
           "1 Program Dukungan Manajemen     309.100.981.000      269.951.163.994     87,33%\n"
           "1.1 Dana Rutin                   282.601.770.000      252.446.449.964     89,33%\n"
           "2 Program Ketahanan Bencana    4.602.995.058.000    4.198.821.988.323     91,22%\n"
           "Jumlah                         4.912.096.039.000    4.468.773.152.316     90,97%\n"
           "realisasi sebesar 90,97% secara keseluruhan\n"]
    b2, k2, tak = baca(hal)
    assert [x["label"] for x in b2] == ["1 Program Dukungan Manajemen", "1.1 Dana Rutin", "2 Program Ketahanan Bencana", "Jumlah"], b2
    assert b2[0]["basis"] == "total" and b2[3]["persen"] == 90.97 and tak == 0
    s2 = uji(b2, k2)
    assert [x["aturan"] for x in s2] == ["a", "d"] and "realisasi" in s2[0]["isi"] and "selisih -1" in s2[0]["isi"], s2   # total salah 1 rupiah; kalimat tanpa basis
    # tanpa basis di halaman: kalimat persen ditandai (d)
    assert [x["aturan"] for x in uji(*baca(["penyerapan anggaran mencapai 90,97% tahun ini\n"])[:2])] == ["d"]
    md = laporan(sel, "contoh")
    assert "## (b) Persen dihitung ulang: 2" in md and "·" not in md and not re.search(r"\baman\b", md, re.I)
    # draf di jalur repo yang terlacak git ditolak; di data/raw (di-ignore) boleh
    assert _di_repo_terlacak(os.path.join(AKAR, "scripts", "bnpb", "unit", "draf.pdf"))
    assert not _di_repo_terlacak(os.path.join(AKAR, "data", "raw", "unit", "draf.pdf")) and not _di_repo_terlacak("/tmp/draf.pdf")
    print(f"keu1.py --cek: lulus ({len(sel)} selisih tercatat 5-lakip.md tertangkap, termasuk Biro Keuangan 95,68%; aturan a dari teks tabel)")


def main(argv):
    if "--cek" in argv:
        cek()
        return 0
    if len(argv) != 1 or argv[0].startswith("-"):
        print(__doc__)
        return 2
    if _di_repo_terlacak(argv[0]):
        print("Ditolak: draf berada di folder repo yang dilacak git. Pindahkan ke luar repo (atau data/raw/) lalu jalankan lagi.", file=sys.stderr)
        return 2
    b, k, tak = baca(halaman_pdf(argv[0]))
    print(laporan(uji(b, k), os.path.basename(argv[0]), tak))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
