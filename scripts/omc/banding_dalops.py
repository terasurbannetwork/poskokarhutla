"""Banding laporan Dalops (PDF harian) dengan operasi OMC karhutla resmi BMKG, per tanggal per provinsi.

Laporan Dalops itu INTERNAL dan repo ini publik: skrip tidak memuat data asli dan HASILNYA TIDAK BOLEH ditulis ke dalam repo
(`--keluar` di dalam repo ditolak). Skrip tidak menilai sumber mana yang benar; ia hanya menyandingkan.

Dari tiap PDF diambil halaman "Operasi Penanganan Karhutla per Tanggal ...", blok OMC DAN HUJAN (provinsi sasaran) dan SEMAI OMC
(provinsi, kg, sortie). Kategori per (tanggal, provinsi): cocok / hanya_dalops / hanya_bmkg, terhadap baris BMKG berjenis karhutla
yang periodenya memuat tanggal itu. Kg dan sortie hanya ada di Dalops: dilabeli "tidak bisa dibandingkan".

Pakai:
  python3 scripts/omc/banding_dalops.py --pdf-dir "~/Downloads/BNPB/03 Laporan Penanganan Karhutla" \\
      --keluar ~/Documents/Laporan-Harian-BNPB/banding_omc/banding_omc.json [--omc public/udara/data/omc_bmkg.json]
  python3 scripts/omc/banding_dalops.py uji        (fixture palsu, tanpa PDF asli)
Butuh pdftotext (poppler).
"""
import argparse, collections, datetime as dt, glob, json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bmkg_omc import AKAR, KARHUTLA, PROVINSI, WIB, kode_provinsi, simpan  # noqa: E402

BULAN = {"jan": 1, "feb": 2, "peb": 2, "mar": 3, "apr": 4, "mei": 5, "jun": 6, "jul": 7, "agu": 8, "ags": 8, "sep": 9, "okt": 10, "nov": 11, "des": 12}
JUDUL = re.compile(r"Operasi Penanganan Karhutla(?: yang Dilakukan)? per Tanggal (\d{1,2}) ([A-Za-z]+) (\d{4})")
LABEL = re.compile(r"(?:OMC DAN HUJAN|HUJAN SETELAH OMC)\s+(\d{1,2}) ([A-Za-z]{3})")
LABEL_SEMAI = re.compile(r"(\d{1,2}) ([A-Za-z]{3})")
POTONG = 100        # kolom kanan (tabel armada per provinsi) dibuang; blok OMC ada di kiri
INDEN_MAKS = 12     # nama provinsi di awal baris; lanjutan teks lebih menjorok
HALAMAN_MAKS = 8
NAMA = sorted(list(PROVINSI.values()) + ["Kepulauan Bangka Belitung", "Kalimantan Barat"], key=len, reverse=True)


def tanggal(h, bln, thn):
    return dt.date(int(thn), BULAN[bln.lower()[:3]], int(h))


def _tgl_label(m, thn_judul, bln_judul):
    """Label 'd Mon' tanpa tahun: tahun = tahun judul, mundur satu bila bulannya lewat bulan judul (31 Des dalam laporan Januari)."""
    d = tanggal(m.group(1), m.group(2), thn_judul)
    return d.replace(year=d.year - 1) if d.month > bln_judul + 1 else d


def uraikan(teks):
    """Teks satu halaman (pdftotext -layout) -> dict laporan, atau None bila bukan halaman OMC.
    {tanggal_judul, sasaran:{tgl:{kode:{nama, tanpa_sortie}}}, semai:{tgl:{kode:{nama, kg, sortie}}}}"""
    j = JUDUL.search(teks)
    if not j:
        return None
    judul = tanggal(*j.groups())
    out = {"tanggal_judul": judul.isoformat(), "sasaran": {}, "semai": {}}
    bagian, tgl_s, tgl_m, tunda = None, None, None, False
    for mentah in teks.splitlines():
        if mentah.strip().startswith("Badan Nasional"):
            break
        baris = mentah[:POTONG]
        ringkas = baris.replace(" ", "")
        if "MODIFIKASI CUACA" in baris:
            bagian = "judul"
            continue
        if bagian is None:
            continue
        m = LABEL.search(baris)
        if m and bagian == "judul":
            tgl_s = _tgl_label(m, judul.year, judul.month)
        if "SASARANOMC" in ringkas:
            bagian = "sasaran"
            continue
        if "SEMAI" in ringkas and bagian != "semai":  # "BAHAN SEMAI" di bawahnya bukan awal bagian baru
            bagian = "semai"
            m = LABEL_SEMAI.search(baris.split("SEMAI")[-1] if "SEMAI" in baris else baris[30:])
            m = m or LABEL_SEMAI.search(baris[30:])
            tgl_m = _tgl_label(m, judul.year, judul.month) if m else tgl_s
            continue
        if bagian not in ("sasaran", "semai"):
            continue
        inden = len(baris) - len(baris.lstrip())
        nama = next((n for n in NAMA if baris.lstrip().startswith(n)), None) if inden <= INDEN_MAKS else None
        if nama:
            kode = kode_provinsi(nama)
            if not kode:
                continue
            if bagian == "sasaran":
                out["sasaran"].setdefault(tgl_s.isoformat() if tgl_s else None, {})[kode] = {"nama": nama, "tanpa_sortie": tunda or "tidak ada sortie" in baris.lower()}
                tunda = False
            else:
                kg = re.search(r"([\d.]+)\s*kg", baris)
                st = re.search(r"(\d+)\s*sortie", baris)
                out["semai"].setdefault(tgl_m.isoformat() if tgl_m else None, {})[kode] = {
                    "nama": nama, "kg": int(kg.group(1).replace(".", "")) if kg else None, "sortie": int(st.group(1)) if st else None}
        elif bagian == "sasaran" and "tidak ada sortie" in baris.lower():
            tunda = True  # sel teks bertingkat: frasa ini ada di baris SEBELUM baris yang memuat nama provinsinya
    return out


def baca_pdf(jalur):
    """PDF -> hasil uraikan() dari halaman OMC pertama, atau None."""
    for h in range(1, HALAMAN_MAKS + 1):
        r = subprocess.run(["pdftotext", "-layout", "-f", str(h), "-l", str(h), jalur, "-"], capture_output=True, text=True, timeout=60)
        if r.returncode == 0 and r.stdout:
            u = uraikan(r.stdout)
            if u:
                return u
    return None


def bmkg_karhutla(omc, tgl):
    """Kode provinsi dengan operasi BMKG jenis karhutla yang periodenya memuat tgl (ISO)."""
    return {b["kode_prov"] for b in omc["baris"] if b["jenis_kegiatan"] == KARHUTLA and b["kode_prov"] and b["periode_awal"] <= tgl <= b["periode_akhir"]}


def banding(laporan, omc):
    """laporan = [(nama_berkas, hasil uraikan)] -> dict hasil. Satu tanggal judul satu laporan (yang terakhir menang; sisanya dicatat)."""
    per_tgl = collections.defaultdict(dict)
    for nama, u in laporan:
        for tgl, ps in u["sasaran"].items():
            for k, v in ps.items():
                per_tgl[tgl].setdefault(k, {"kode": k, "provinsi": v["nama"], "sasaran": False, "semai": False, "kg": None, "sortie": None, "tanpa_sortie": False, "laporan": nama})
                per_tgl[tgl][k].update(sasaran=True, tanpa_sortie=v["tanpa_sortie"])
        for tgl, ps in u["semai"].items():
            for k, v in ps.items():
                per_tgl[tgl].setdefault(k, {"kode": k, "provinsi": v["nama"], "sasaran": False, "semai": False, "kg": None, "sortie": None, "tanpa_sortie": False, "laporan": nama})
                per_tgl[tgl][k].update(semai=True, kg=v["kg"], sortie=v["sortie"])
    hasil, tot = [], collections.Counter()
    for tgl in sorted(t for t in per_tgl if t):
        dalops = per_tgl[tgl]
        bm = bmkg_karhutla(omc, tgl)
        cocok = sorted(set(dalops) & bm)
        hd, hb = sorted(set(dalops) - bm), sorted(bm - set(dalops))
        tot.update(cocok=len(cocok), hanya_dalops=len(hd), hanya_bmkg=len(hb))
        nm = lambda k: PROVINSI.get(k, k)  # noqa: E731
        hasil.append({"tanggal": tgl, "dilapor_dalops": sorted(dalops.values(), key=lambda r: r["kode"]),
                      "cocok": [nm(k) for k in cocok], "hanya_dalops": [nm(k) for k in hd], "hanya_bmkg": [nm(k) for k in hb],
                      "kg_sortie": "tidak bisa dibandingkan: hanya Dalops yang memuatnya, BMKG tidak"})
    tgls = [h["tanggal"] for h in hasil]
    return {"ringkasan": dict(tot), "rentang": [tgls[0], tgls[-1]] if tgls else None, "n_tanggal": len(tgls), "per_tanggal": hasil}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--pdf-dir", required=True)
    ap.add_argument("--keluar", required=True)
    ap.add_argument("--omc", default=os.path.join(AKAR, "public/udara/data/omc_bmkg.json"))
    a = ap.parse_args()
    keluar = os.path.realpath(os.path.expanduser(a.keluar))
    if keluar == AKAR or keluar.startswith(os.path.realpath(AKAR) + os.sep):
        sys.exit("banding_dalops: --keluar di dalam repo ditolak (laporan Dalops internal, repo publik)")
    omc = json.load(open(a.omc))
    pdfs = sorted(glob.glob(os.path.join(os.path.expanduser(a.pdf_dir), "*.pdf")), key=os.path.getmtime)
    terpilih, dibuang, bukan = {}, [], []
    for p in pdfs:
        try:
            u = baca_pdf(p)
        except Exception as x:  # satu PDF rusak tidak menjatuhkan sisanya
            bukan.append(f"{os.path.basename(p)}: {type(x).__name__}")
            continue
        if not u:
            bukan.append(os.path.basename(p))
            continue
        if u["tanggal_judul"] in terpilih:
            dibuang.append(terpilih[u["tanggal_judul"]][0])  # versi lebih baru (mtime) menang
        terpilih[u["tanggal_judul"]] = (os.path.basename(p), u)
    hasil = banding([(n, u) for n, u in terpilih.values()], omc)
    simpan(keluar, {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "n_pdf": len(pdfs), "n_laporan": len(terpilih),
                    "pdf_tanpa_halaman_omc": len(bukan), "versi_lama_dibuang": len(dibuang),
                    "bmkg": {"last_updated": omc.get("last_updated"), "diambil": omc.get("diambil"), "jenis": KARHUTLA},
                    "catatan": "Penyandingan, bukan penilaian. Kg dan sortie hanya ada di Dalops. Sasaran tanpa semai tercatat tanpa_sortie bila laporan menyebut tidak ada sortie. Internal: jangan masuk repo.",
                    **hasil})
    r = hasil["ringkasan"]
    print(f"banding_dalops: {len(terpilih)} laporan dari {len(pdfs)} PDF ({len(bukan)} tanpa halaman OMC, {len(dibuang)} versi lama dibuang), rentang {hasil['rentang']}, "
          f"cocok {r.get('cocok', 0)}, hanya_dalops {r.get('hanya_dalops', 0)}, hanya_bmkg {r.get('hanya_bmkg', 0)} -> {keluar}")
    for h in hasil["per_tanggal"][:6]:
        print(f"  {h['tanggal']}: cocok {h['cocok']}, hanya Dalops {h['hanya_dalops']}, hanya BMKG {h['hanya_bmkg']}")


# ---------------------------------------------------------------- self-check (data PALSU berformat sama: tahun 2031, angka karangan)
def _palsu():
    def b(kiri, kanan=""):
        return kiri.ljust(110) + kanan
    return "\n".join([
        "Operasi Penanganan Karhutla per Tanggal 5 Maret 2031",
        "1 personel darat, 2 armada udara, dan OMC di 2 provinsi dengan hujan di 1 provinsi",
        b("          MODIFIKASI CUACA"),
        b("       OMC DAN HUJAN                        4 Mar                               1 dari 2 provinsi hujan"),
        b("                            SASARAN OMC                  HASIL", "Riau        9       5   14 unit"),
        b("    Kalimantan Barat        Kab Fiktif A, dll.", "Kalimantan Selatan   9    5     14 unit"),
        b("                                                         HUJAN"),
        b("                            tidak ada sortie, awan belum", "Jambi   1   3   4 unit"),
        b("    Riau                    mendukung"),
        b("    Sumatera Utara          Kab Fiktif B"),
        b("       SEMAI OMC                   4 Mar                                   3 sortie, 1.500 kg"),
        b("                            NaCl                         HASIL"),
        b("    Kalimantan Barat        1.200 kg 2 sortie"),
        b("    Jawa Tengah             300 kg   1 sortie"),
        "Badan Nasional Penanggulangan Bencana | Copyright 2031",
        b("    Papua                   9.999 kg 9 sortie"),   # setelah kaki: tidak boleh terbaca
    ])


def uji():
    u = uraikan(_palsu())
    assert u["tanggal_judul"] == "2031-03-05"
    s, m = u["sasaran"]["2031-03-04"], u["semai"]["2031-03-04"]
    assert set(s) == {"61", "14", "12"} and s["14"]["tanpa_sortie"] and not s["61"]["tanpa_sortie"], s   # kolom kanan (Kalsel, Jambi) terbuang
    assert set(m) == {"61", "33"} and m["61"] == {"nama": "Kalimantan Barat", "kg": 1200, "sortie": 2} and m["33"]["kg"] == 300, m
    assert uraikan("Halaman lain\nbukan OMC") is None
    omc = {"baris": [
        {"jenis_kegiatan": KARHUTLA, "kode_prov": "61", "periode_awal": "2031-03-03", "periode_akhir": "2031-03-06"},   # cocok
        {"jenis_kegiatan": KARHUTLA, "kode_prov": "62", "periode_awal": "2031-03-04", "periode_akhir": "2031-03-04"},   # hanya BMKG
        {"jenis_kegiatan": "Pengisian Waduk", "kode_prov": "14", "periode_awal": "2031-03-01", "periode_akhir": "2031-03-31"},  # bukan karhutla
        {"jenis_kegiatan": KARHUTLA, "kode_prov": "12", "periode_awal": "2031-03-05", "periode_akhir": "2031-03-09"},   # tanggal lain
    ]}
    h = banding([("palsu.pdf", u)], omc)
    t = h["per_tanggal"][0]
    assert t["tanggal"] == "2031-03-04" and t["cocok"] == ["Kalimantan Barat"], t
    assert t["hanya_dalops"] == ["Sumatera Utara", "Riau", "Jawa Tengah"] or sorted(t["hanya_dalops"]) == ["Jawa Tengah", "Riau", "Sumatera Utara"], t["hanya_dalops"]
    assert t["hanya_bmkg"] == ["Kalimantan Tengah"] and h["ringkasan"] == {"cocok": 1, "hanya_dalops": 3, "hanya_bmkg": 1}, h["ringkasan"]
    assert "tidak bisa dibandingkan" in t["kg_sortie"] and h["rentang"] == ["2031-03-04", "2031-03-04"]
    # label tanpa tahun yang melewati tutup tahun: 31 Des di laporan 1 Januari
    assert _tgl_label(re.match(r"(\d+) (\w+)", "31 Des"), 2032, 1) == dt.date(2031, 12, 31)
    print("uji banding_dalops ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
