"""IRT-1 Papan umur rekomendasi TLHP per unit (DESAIN-TEKNIS sec 6.28; ALGORITMA sec 7.7; tiket RU-105).

SKRIP LOKAL pemilik (U9): tanpa D1, R2, rute, atau langkah jalan.py. Masukan = CSV ekspor SIPTL/SIMHPNAS atau rekap Excel Bagian TU Itama
(simpan sebagai CSV) di luar repo; keluaran = SATU berkas HTML mandiri `tlhp_<tanggal>.html` berisi kartu .ex-std, juga di luar repo.
Teks ringkas hanya dibaca untuk kata kunci calon TPTD dan tidak pernah ditulis ke keluaran; keluaran hanya hitungan per unit
(tanpa nama pejabat atau pihak ketiga).

Kolom CSV (judul baris pertama, huruf kecil): sumber (BPK/APIP/BPKP), no_lhp, tgl_lhp (YYYY-MM-DD), unit, ringkas, status.
Status Pedoman 1/2025: sesuai, belum sesuai, belum ditindaklanjuti, tidak dapat ditindaklanjuti (= TPTD ditetapkan).
Rumus: umur = hari kalender sejak tgl_lhp; merah bila umur > 60 hari (Jam Aturan `tlhp`) dan status bukan sesuai;
calon TPTD (SARAN, bukan penetapan) bila umur > 2 tahun, status terbuka, dan ringkasan memuat kata kunci kriteria TPTD;
%TL = sesuai / (total - TPTD ditetapkan), penyebut 0 = belum ada data (bukan 0). Target Renstra: BPK 75%, APIP 46% sampai 70%.
Catatan pasal: 60 hari tertulis untuk rekomendasi BPK; untuk APIP itu tafsir (asumsi).

  python3 -I scripts/bnpb/unit/irt1.py --masuk ekspor.csv --keluar ~/Dokumen/tlhp [--tanggal 2026-11-26]
  python3 -I scripts/bnpb/unit/irt1.py --cek
"""
import csv
import datetime
import html
import os
import statistics
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
STATUS = {"sesuai": "sesuai", "belum sesuai": "belum", "belum ditindaklanjuti": "belum", "tidak dapat ditindaklanjuti": "tptd"}
KATA_TPTD = ("unit sudah tidak ada", "pailit", "meninggal")   # kriteria TPTD Pedoman 1/2025 yang bisa dikenali dari teks (saran)
HARI_TPTD = 730   # 2 tahun
KOLOM = ("sumber", "no_lhp", "tgl_lhp", "unit", "ringkas", "status")
TARGET = "BPK 75%, APIP 46% sampai 70%"
CSS = [os.path.join(AKAR, "public", "inti", f) for f in ("tema.css", "kartu.css")]
CSS_TABEL = (".ad-tabel{width:100%;border-collapse:collapse;font-size:var(--fs-2,13px)}"
             ".ad-tabel th{background:var(--head-bg);color:var(--on-head,#fff);padding:8px 10px;text-align:center}"
             ".ad-tabel td{padding:7px 10px;border-bottom:1px solid var(--line);text-align:left}.ad-tabel td.n{text-align:right}"
             ".ex-tabel{overflow-x:auto}body{margin:0;padding:20px;background:var(--paper)}")


def _tgl(s):
    return datetime.date.fromisoformat(str(s).strip())


def baca(lintas):
    """Baris CSV -> daftar rekomendasi; baris tanpa tanggal sah atau status dikenal dihitung terpisah (bukan diisi)."""
    r = csv.DictReader(lintas)
    hilang = [k for k in KOLOM if k not in (r.fieldnames or [])]
    if hilang:
        raise ValueError(f"kolom CSV kurang: {hilang}")
    ok, buang = [], 0
    for b in r:
        st = STATUS.get(" ".join(str(b["status"]).lower().split()))
        try:
            tgl = _tgl(b["tgl_lhp"])
        except ValueError:
            tgl = None
        if st is None or tgl is None or not str(b["unit"]).strip():
            buang += 1
            continue
        ok.append({"sumber": str(b["sumber"]).strip().upper(), "no": str(b["no_lhp"]).strip(), "tgl": tgl, "unit": " ".join(b["unit"].split()),
                   "st": st, "tptd_kata": any(k in str(b["ringkas"]).lower() for k in KATA_TPTD)})
    return ok, buang


def hitung(rek, hari_ini):
    batas = jam.nilai("tlhp")
    per = {}
    for x in rek:
        umur = (hari_ini - x["tgl"]).days
        u = per.setdefault(x["unit"], {"total": 0, "sesuai": 0, "tptd": 0, "merah": 0, "calon": 0, "umur": []})
        u["total"] += 1
        if x["st"] == "sesuai":
            u["sesuai"] += 1
            continue
        if x["st"] == "tptd":
            u["tptd"] += 1
        else:
            u["umur"].append(umur)
            u["calon"] += umur > HARI_TPTD and x["tptd_kata"]
        u["merah"] += umur > batas
    out = []
    for nama in sorted(per):
        u = per[nama]
        pen = u["total"] - u["tptd"]
        out.append({"unit": nama, "total": u["total"], "sesuai": u["sesuai"], "merah": u["merah"], "calon": u["calon"],
                    "median": statistics.median(u["umur"]) if u["umur"] else None, "tl": round(100 * u["sesuai"] / pen, 1) if pen > 0 else None})
    return out


def _sel(v, n=False):
    return f'<td class="n">{html.escape(f"{v:,}".replace(",", ".") if isinstance(v, int) else f"{v:g}".replace(".", ","))}</td>' if v is not None and n \
        else f"<td>{html.escape('belum ada data' if v is None else str(v))}</td>"


def html_kartu(baris, buang, hari_ini):
    kep = [("Unit", "Unit pemilik rekomendasi"), ("Total", "Semua rekomendasi unit"), ("Sesuai", "Status sesuai"),
           ("Merah", f"Umur lebih dari {jam.nilai('tlhp')} hari dan status bukan sesuai"),
           ("Calon TPTD (saran)", "Umur lebih dari 2 tahun, masih terbuka, ringkasan memuat kata kunci kriteria TPTD; saran, bukan penetapan"),
           ("Median umur terbuka (hari)", "Rekomendasi yang belum sesuai dan bukan TPTD"),
           ("Tindak lanjut (%)", f"sesuai / (total - TPTD ditetapkan). Target Renstra: {TARGET}")]
    th = "".join(f'<th scope="col" title="{html.escape(t)}">{html.escape(k)}</th>' for k, t in kep)
    tb = "".join("<tr>" + _sel(b["unit"]) + "".join(_sel(b[k], True) for k in ("total", "sesuai", "merah", "calon", "median", "tl")) + "</tr>" for b in baris)
    ring = (f'<dl class="un-ringkas"><div><dt>Rekomendasi terbaca</dt><dd>{sum(b["total"] for b in baris)}</dd></div>'
            f'<div><dt>Merah</dt><dd>{sum(b["merah"] for b in baris)}</dd></div><div><dt>Baris tak terbaca</dt><dd>{buang}</dd></div></dl>')
    css = "".join(open(p, encoding="utf-8").read() for p in CSS) + CSS_TABEL
    return ('<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
            f"<title>Umur TLHP {hari_ini}</title><style>{css}</style></head><body>"
            '<section class="ex ex-std" id="irt1-umur" aria-labelledby="irt1-umur-j"><header class="ex-hd"><div class="ex-pl">'
            '<span class="ex-ey">Umur TLHP</span><span class="bn-pil">Hitungan kita</span><span class="bn-pil">Saran, bukan penetapan</span></div>'
            f'<div class="ex-jd"><h3 id="irt1-umur-j">Papan umur rekomendasi per unit</h3></div></header><div class="ex-bd">{ring}'
            f'<div class="ex-tabel" role="region" tabindex="0" aria-labelledby="irt1-umur-j"><table class="ad-tabel"><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table></div>'
            f'<p>Per {hari_ini.strftime("%d-%m-%Y")}. Asumsi: 60 hari untuk rekomendasi APIP adalah tafsir kita.</p></div></section></body></html>')


def di_dalam(jalur, akar):
    """True bila jalur sama dengan atau di bawah akar, kebal beda huruf besar-kecil (macOS): naik dari leluhur terdekat yang ada, bandingkan lewat samefile."""
    c = os.path.abspath(jalur)
    while not os.path.exists(c):
        c = os.path.dirname(c)
    while True:
        if os.path.samefile(c, akar):
            return True
        if os.path.dirname(c) == c:
            return False
        c = os.path.dirname(c)


def tulis(lintas, keluar, hari_ini):
    nyata = os.path.realpath(keluar)
    if di_dalam(nyata, AKAR):
        raise ValueError("keluaran harus di luar repo (U9: temuan audit tidak boleh ter-commit)")
    rek, buang = baca(lintas)
    os.makedirs(nyata, exist_ok=True)
    p = os.path.join(nyata, f"tlhp_{hari_ini.isoformat()}.html")
    with open(p, "w", encoding="utf-8") as f:
        f.write(html_kartu(hitung(rek, hari_ini), buang, hari_ini))
    return p


def cek():
    import io
    kini = datetime.date(2026, 11, 26)
    sumber = io.StringIO(
        "sumber,no_lhp,tgl_lhp,unit,ringkas,status\n"
        "BPK,L1,2026-09-27,Unit A,uraian rahasia Budi,sesuai\n"          # 60 hari, sesuai: tidak merah
        "BPK,L2,2026-09-27,Unit A,x,belum sesuai\n"                      # umur 60: tepat batas, tidak merah
        "BPK,L3,2026-09-26,Unit A,x,belum ditindaklanjuti\n"             # umur 61: merah
        "APIP,L4,2023-01-10,Unit A,pihak ketiga pailit,belum sesuai\n"   # > 2 tahun + kata kunci: calon TPTD
        "APIP,L5,2023-01-10,Unit A,x,tidak dapat ditindaklanjuti\n"      # TPTD ditetapkan: keluar dari penyebut
        "APIP,L6,2024-01-10,Unit B,x,tidak dapat ditindaklanjuti\n"      # unit B: total - TPTD = 0 -> belum ada data
        "APIP,L7,tanggal-rusak,Unit B,x,sesuai\n")                       # tak terbaca: dihitung, tidak diisi
    rek, buang = baca(sumber)
    h = {b["unit"]: b for b in hitung(rek, kini)}
    a, b = h["Unit A"], h["Unit B"]
    assert buang == 1 and a["total"] == 5 and a["sesuai"] == 1, (buang, a)
    assert a["merah"] == 3, a   # L3 (61 hari), L4, L5 tptd tetap dihitung merah bila bukan sesuai (rumus ALGORITMA 7.7)
    assert a["calon"] == 1, a
    assert a["tl"] == 25.0, a   # 1 / (5 - 1)
    assert b["total"] == 1 and b["tl"] is None, b   # penyebut 0 = null, bukan 0
    assert a["median"] == statistics.median([60, 61, (kini - datetime.date(2023, 1, 10)).days]), a
    with tempfile.TemporaryDirectory() as d:
        sumber.seek(0)
        p = tulis(sumber, d, kini)
        teks = open(p, encoding="utf-8").read()
        assert os.path.basename(p) == "tlhp_2026-11-26.html" and "ex-std" in teks and "belum ada data" in teks
        assert "Budi" not in teks and "rahasia" not in teks and "pailit" not in teks, "ringkasan tidak boleh bocor ke keluaran"
        assert "·" not in teks
        try:
            sumber.seek(0)
            tulis(sumber, os.path.join(AKAR, "tmp_irt1"), kini)
            raise AssertionError("keluaran di dalam repo tidak ditolak")
        except ValueError:
            pass
        assert di_dalam(os.path.join(AKAR, "tmp_irt1"), AKAR) and di_dalam(os.path.join(AKAR.upper(), "x", "y"), AKAR) == os.path.exists(AKAR.upper()), "beda huruf besar-kecil"
        assert not di_dalam(d, AKAR)
    try:
        baca(io.StringIO("sumber,no_lhp\nBPK,L1\n"))
        raise AssertionError("kolom kurang tidak ditolak")
    except ValueError:
        pass
    print("irt1.py --cek: lulus (batas 60 hari, calon TPTD, %TL, penyebut 0 = belum ada data, keluaran di luar repo)")


def main(a):
    g = lambda n, d=None: a[a.index(n) + 1] if n in a else d
    if "--cek" in a:
        return cek()
    if not (g("--masuk") and g("--keluar")):
        print(__doc__)
        return
    with open(g("--masuk"), encoding="utf-8-sig", newline="") as f:
        print(tulis(f, os.path.expanduser(g("--keluar")), _tgl(g("--tanggal")) if g("--tanggal") else datetime.date.today()))


if __name__ == "__main__":
    main(sys.argv[1:])
