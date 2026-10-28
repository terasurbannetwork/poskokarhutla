"""NA-04b Ternak per kab dari tabel BPS provinsi (mentah/bps/ternak_<prov>_2024.txt, ditarik dgn air_jawa_bps.mjs, Playwright)
-> data/kajian-bnpb/neraca-air/masukan/ternak_kab.csv (kode, sapi_kerbau, kambing_domba, babi, unggas, tahun, sumber).
Kolom kosong = tidak tersedia (null), bukan 0. Unggas: ayam buras + itik (tabel BPS populasi unggas, ayam ras '...' tidak tersedia) = batas bawah; kosong bila tabel prov tak ada.
Pakai: python3 masukan_bps.py ternak | industri | uji"""
import csv, os, re, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
PAKET = os.path.join(AKAR, "data/kajian-bnpb/neraca-air")
KAB = os.path.join(AKAR, "data/kajian-bnpb/data/air-jawa/kab_jawa.csv")
KOLOM = ["Sapi Perah", "Sapi Potong", "Kerbau", "Kuda", "Kambing", "Domba", "Babi"]


def angka(s):
    s = s.strip()
    if s in ("–", "-", "~0"):
        return 0.0
    if s in ("...", "NA", ""):
        return None
    return float(s.replace(".", "").replace(",", "."))   # titik = pemisah ribuan BPS


def baca_tabel(teks):
    """-> (judul_kolom, {nama_bps: [nilai]}); kolom diambil dari header, bukan diasumsikan urutannya"""
    L = teks.splitlines()
    i = next(n for n, l in enumerate(L) if l.startswith("Kabupaten/Kota"))
    kol = [re.sub(r"Populasi Ternak - | \(Ekor\)", "", l.strip(), flags=re.I) for l in L[i + 1:] if l.strip().startswith("Populasi Ternak")]
    if kol != KOLOM:
        raise ValueError(f"kolom BPS berubah: {kol}")
    out = {}
    for l in L[i + 1:]:
        c = l.split("\t")
        if len(c) == len(KOLOM) + 1 and c[0].strip():
            out[c[0].strip()] = [angka(x) for x in c[1:]]
    return kol, out


def baca_unggas(teks):
    """-> {nama: buras+itik atau None}; ayam ras (petelur/pedaging) tidak tersedia di tabel BPS kab 2024 ('...'), jadi batas bawah"""
    L = teks.splitlines()
    i = next(n for n, l in enumerate(L) if l.startswith("Kabupaten/Kota"))
    kol = [re.sub(r"Populasi Unggas - | \(Ekor\)", "", l.strip(), flags=re.I) for l in L[i + 1:] if l.strip().startswith("Populasi Unggas")]
    if kol[:2] != ["Ayam Buras", "Itik dan itik manila"]:
        raise ValueError(f"kolom unggas BPS berubah: {kol}")
    out = {}
    for l in L[i + 1:]:
        c = l.split("\t")
        if len(c) == len(kol) + 1 and c[0].strip():
            a, b = angka(c[1]), angka(c[2])
            out[c[0].strip()] = None if a is None or b is None else a + b
    return out


def kunci(nama):
    return re.sub(r"^Administrasi ", "", re.sub(r"^Kota Administrasi ", "Kota ", nama.replace("Kab. ", ""))).strip()


def gabung(v):
    d = dict(zip(KOLOM, v))
    if any(d[k] is None for k in KOLOM):
        return None
    return {"sapi_kerbau": d["Sapi Perah"] + d["Sapi Potong"] + d["Kerbau"] + d["Kuda"] * 0,   # kuda tak ada di SNI 2002 Tabel 4
            "kambing_domba": d["Kambing"] + d["Domba"], "babi": d["Babi"]}


def ternak():
    kab = list(csv.DictReader(open(KAB)))
    os.makedirs(os.path.join(PAKET, "masukan"), exist_ok=True)
    rows, hilang = [], []
    for p in ("31", "32", "33", "34", "35", "36"):
        jalur = os.path.join(PAKET, f"mentah/bps/ternak_{p}_2024.txt")
        teks = open(jalur).read()
        url = re.search(r"#url (\S+)", teks).group(1)
        _, tab = baca_tabel(teks)
        ju = os.path.join(PAKET, f"mentah/bps/unggas_{p}_2024.txt")
        ung = baca_unggas(open(ju).read()) if os.path.exists(ju) else {}
        for k in (r for r in kab if r["prov_kode"] == p):
            n = kunci(k["nama"])
            g = gabung(tab[n]) if n in tab else None
            if g is None:
                hilang.append(k["kode"])
                continue
            rows.append({"kode": k["kode"], **{c: f"{g[c]:.0f}" for c in g}, "unggas": "" if ung.get(n) is None else f"{ung[n]:.0f}", "tahun": 2024,
                         "sumber": url + (" ; unggas = ayam buras + itik saja (ayam ras tidak tersedia): batas bawah" if ung.get(n) is not None else "")})
    with open(os.path.join(PAKET, "masukan/ternak_kab.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, ["kode", "sapi_kerbau", "kambing_domba", "babi", "unggas", "tahun", "sumber"])
        w.writeheader()
        w.writerows(rows)
    print(f"ternak_kab.csv: {len(rows)} kab, hilang {hilang}", file=sys.stderr)
    assert not hilang, f"kab tanpa baris BPS: {hilang}"


INDUSTRI = {"31": 2, "32": 1, "33": 1, "36": 1}   # prov -> kolom nilai (tenaga kerja IBS besar-sedang); 34 dan 35 belum ada tabel kab


def industri():
    """tenaga kerja industri besar-sedang per kab dari tabel BPS prov (mentah/bps/industri_<prov>.txt, bagian #TABEL).
    Tahun beda per provinsi (2021-2022), dicatat per baris. Kab tanpa tabel (DIY, Jatim) tidak ditulis = null."""
    kab = list(csv.DictReader(open(KAB)))
    rows, hilang = [], []
    for p, kol in INDUSTRI.items():
        teks = open(os.path.join(PAKET, f"mentah/bps/industri_{p}.txt")).read()
        url = re.search(r"#url (\S+)", teks).group(1)
        baris = teks.split("#TABEL\n", 1)[1].splitlines()
        tahun = next(re.fullmatch(r"(20\d\d)(\t20\d\d)*", b.strip()).group(1) for b in baris if re.fullmatch(r"(20\d\d)(\t20\d\d)*", b.strip())) \
            if any(re.fullmatch(r"(20\d\d)(\t20\d\d)*", b.strip()) for b in baris) else re.search(r"\b(20\d\d)\b", " ".join(baris[:4])).group(1)
        tab = {}
        for b in baris:
            c = b.split("\t")
            if len(c) > kol and re.search(r"\d", c[kol]) and not re.fullmatch(r"20\d\d", c[kol]):
                n = re.sub(r"^\d{4} ", "", c[0].strip())
                n = re.sub(r"^Kabupaten |^Kab ", "", n)
                if p == "31" and n.startswith("Jakarta"):
                    n = "Kota " + n
                tab[n] = angka(c[kol])
        for k in (r for r in kab if r["prov_kode"] == p):
            n = kunci(k["nama"])
            if n in tab and tab[n] is not None:
                rows.append({"kode": k["kode"], "tenaga_kerja": f"{tab[n]:.0f}", "tahun": tahun, "sumber": url,
                             "catatan": "IBS (industri besar-sedang) saja; mikro-kecil tidak termasuk, jadi batas bawah"})
            else:
                hilang.append(k["kode"])
    with open(os.path.join(PAKET, "masukan/industri_kab.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, ["kode", "tenaga_kerja", "tahun", "sumber", "catatan"])
        w.writeheader()
        w.writerows(rows)
    print(f"industri_kab.csv: {len(rows)} kab; tanpa baris (null): {hilang}", file=sys.stderr)


def uji():
    assert angka("1.234") == 1234 and angka("–") == 0 and angka("...") is None
    t = "Kabupaten/Kota\n\t\n\n" + "\n".join(f"Populasi Ternak - {k} (Ekor)\n\t" for k in KOLOM) + "\n\nA\t1\t2\t3\t4\t5\t6\t–\nB\t1\t2\t3\t4\t5\t6\t...\n"
    _, tab = baca_tabel(t)
    assert gabung(tab["A"]) == {"sapi_kerbau": 6, "kambing_domba": 11, "babi": 0}
    assert gabung(tab["B"]) is None, "data tak tersedia harus null, bukan 0"
    try:
        baca_tabel(t.replace("Kuda", "Ayam"))
    except ValueError:
        pass
    else:
        raise AssertionError("kolom berubah lolos")
    assert kunci("Kota Administrasi Jakarta Selatan") == "Kota Jakarta Selatan" and kunci("Kab. Bogor") == "Bogor"
    print("ok masukan_bps")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else ternak() if sys.argv[1:] == ["ternak"] else industri() if sys.argv[1:] == ["industri"] else sys.exit(__doc__)
