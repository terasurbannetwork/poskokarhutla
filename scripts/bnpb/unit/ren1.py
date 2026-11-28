"""REN-1 Rapor Reformasi Birokrasi: di mana poin hilang (DESAIN-TEKNIS sec 5.11; ALGORITMA sec 7.4; tiket RU-048).

Langkah jalan.py (harian; berkas statis, berubah saat catatan LAKIP diperbarui). Masukan satu: baris komponen nilai RB 2024
(surat KemenPANRB B/793/RB.06/2025) di data/kajian-bnpb/pustaka/5-lakip.md. Per komponen i:
  poin_hilang_i = bobot_i - nilai_tertimbang_i            (ditolak saat muat bila tertimbang > bobot atau < 0)
  prioritas_i   = poin_hilang_i x faktor_i                (faktor kemudahan: penilaian analis, asumsi)
Total poin hilang dari 100 = 100 - nilai RB (resmi). Catatan LAKIP hanya merinci 22 komponen berbobot 77; sisa bobot
tanpa rincian di catatan ditulis apa adanya, tidak dibagi ke komponen.
Pemilik komponen: Renstra 2025-2029 Sasaran Program 6 (pustaka/3-renstra.md); komponen yang tidak disebut di sana: None.

  python3 -I scripts/bnpb/unit/ren1.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

LAKIP = os.path.join(rapor.AKAR, "data", "kajian-bnpb", "pustaka", "5-lakip.md")
PENANDA = "B/793/RB.06/2025"
KOMPONEN = re.compile(r"^(?P<nama>[^;:]+?) (?P<nilai>[\d.,]+) \((?:(?P<tertimbang>[\d,]+) dari (?P<bobot>[\d,]+)|bobot (?P<bobot_saja>[\d,]+))")
NILAI_RB = re.compile(r"capaian RB BNPB 2024 = \*\*([\d,]+)\*\*")

# Penilaian analis (DT 5.11, berlabel asumsi): 1 cukup ikut pengukuran, 0,5 perubahan proses, 0,25 struktural.
STRUKTURAL = {"Penyederhanaan Struktur Organisasi", "Sistem Kerja Penyederhanaan Birokrasi", "Sistem Merit", "BerAKHLAK",
              "Arsitektur SPBE", "SPI"}
IKUT_UKUR = {"Indeks Kualitas Kebijakan", "Indeks Reformasi Hukum"}
# Renstra 2025-2029 Sasaran Program 6 (pustaka/3-renstra.md baris Biro ...): unit penanggung target komponen
PEMILIK = {
    "Biro Perencanaan": ("Indeks Perencanaan Pembangunan", "Capaian Prioritas Nasional", "SAKIP"),
    "Biro Keuangan": ("Opini BPK", "IKPA"),
    "Biro Hukum, Organisasi, dan Kerja Sama": ("Renaksi RB General", "Tingkat Implementasi Renaksi", "Penyederhanaan Struktur Organisasi",
                                               "Sistem Kerja Penyederhanaan Birokrasi", "Indeks Kualitas Kebijakan", "Indeks Reformasi Hukum",
                                               "Indeks Pelayanan Publik", "SPI", "SKM"),
    "Biro SDM dan Umum": ("Digitalisasi Arsip", "Sistem Merit", "Indeks Pengelolaan Aset", "Tata Kelola Pengadaan", "BerAKHLAK"),
}
LABEL_FAKTOR = "Asumsi: faktor kemudahan adalah penilaian analis"


def _f(s):
    return float(s.replace(",", "."))


def faktor(nama):
    return 1.0 if nama in IKUT_UKUR else 0.25 if nama in STRUKTURAL else 0.5


def pemilik(nama):
    return next((u for u, ks in PEMILIK.items() if nama in ks), None)


def urai(teks):
    baris = next((b for b in teks.splitlines() if PENANDA in b), None)
    if baris is None:
        raise ValueError(f"baris komponen RB ({PENANDA}) tidak ada di catatan LAKIP")
    isi = baris.split("nilai (dari bobot)):", 1)[1]
    out = []
    for bag in isi.split(";"):
        m = KOMPONEN.match(bag.strip())
        if not m:
            raise ValueError(f"komponen RB tidak terurai: {bag.strip()[:80]!r}")
        nilai = _f(m["nilai"])
        bobot = _f(m["bobot"] or m["bobot_saja"])
        tertimbang = _f(m["tertimbang"]) if m["tertimbang"] else nilai  # "(bobot B)": nilai sudah tertimbang
        if not 0 <= tertimbang <= bobot:
            raise ValueError(f"{m['nama']}: nilai tertimbang {tertimbang} di luar 0..bobot {bobot}")
        out.append({"komponen": m["nama"].strip(), "nilai": nilai, "bobot": bobot, "tertimbang": tertimbang})
    m = NILAI_RB.search(teks)
    return out, (_f(m.group(1)) if m else None)


def bangun(teks):
    komp, nilai_rb = urai(teks)
    for k in komp:
        k["poin_hilang"] = round(k["bobot"] - k["tertimbang"], 6)
        k["faktor"] = faktor(k["komponen"])
        k["prioritas"] = round(k["poin_hilang"] * k["faktor"], 6)
        k["pemilik"] = pemilik(k["komponen"])
    komp.sort(key=lambda k: (-k["prioritas"], -k["poin_hilang"], k["komponen"]))
    bobot = round(sum(k["bobot"] for k in komp), 6)
    hilang_rinci = round(sum(k["poin_hilang"] for k in komp), 6)
    hilang_total = None if nilai_rb is None else round(100 - nilai_rb, 6)
    k1 = rapor.kartu(
        id="ren1-rb", sistem="REN-1", pil="Reformasi Birokrasi", ikon="timbang", judul="Poin RB yang hilang",
        angka=[{"k": "hilang", "label": "Poin hilang dari 100", "nilai": hilang_total, "desimal": 2, "title": "100 - nilai RB BNPB 2024"},
               {"k": "nilai_rb", "label": "Nilai RB BNPB 2024", "nilai": nilai_rb, "desimal": 2},
               {"k": "hilang_rinci", "label": f"Hilang di {len(komp)} komponen bertabel", "nilai": hilang_rinci, "desimal": 2},
               {"k": "bobot_lain", "label": "Bobot tanpa rincian di catatan LAKIP (poin)", "nilai": round(100 - bobot, 6), "desimal": 0}],
        kolom=[{"k": "komponen", "label": "Komponen"},
               {"k": "nilai", "label": "Nilai", "title": "nilai komponen menurut surat KemenPANRB", "angka": True, "desimal": 2},
               {"k": "tertimbang", "label": "Tertimbang", "angka": True, "desimal": 2},
               {"k": "bobot", "label": "Bobot (poin)", "title": "bobot komponen dalam poin dari 100", "angka": True, "desimal": 1},
               {"k": "poin_hilang", "label": "Poin hilang", "title": "bobot - nilai tertimbang", "angka": True, "desimal": 2},
               {"k": "faktor", "label": "Faktor kemudahan", "title": "1 cukup ikut pengukuran, 0,5 perubahan proses, 0,25 struktural (penilaian analis)", "angka": True, "desimal": 2},
               {"k": "prioritas", "label": "Prioritas", "title": "poin hilang x faktor kemudahan", "angka": True, "desimal": 2},
               {"k": "pemilik", "label": "Pemilik", "title": "unit penanggung target di Renstra 2025-2029 Sasaran Program 6"}],
        baris=[{x: k[x] for x in ("komponen", "nilai", "tertimbang", "bobot", "poin_hilang", "faktor", "prioritas")}
               | {"pemilik": k["pemilik"] or "belum tertulis di Renstra"} for k in komp],
        rumus="poin hilang = bobot - nilai tertimbang; prioritas = poin hilang x faktor kemudahan",
        sumber=["lakip_2025_rb", "renstra_2025_2029"], label=["resmi", "hitungan_kita"], asumsi=[LABEL_FAKTOR])
    sumber = [{"nama": "LAKIP BNPB 2025 (catatan baca), komponen RB 2024 surat KemenPANRB B/793/RB.06/2025",
               "url": "repo:data/kajian-bnpb/pustaka/5-lakip.md", "diambil": "2026-11-02", "lisensi": "dokumen publik BNPB"},
              {"nama": "Renstra BNPB 2025-2029 (catatan baca)", "url": "repo:data/kajian-bnpb/pustaka/3-renstra.md",
               "diambil": "2026-11-02", "lisensi": "dokumen publik BNPB"}]
    b = rapor.berkas([k1], sumber)
    b["data"] = {"komponen": komp, "nilai_rb": nilai_rb, "bobot_terinci": bobot, "hilang_terinci": hilang_rinci, "hilang_total": hilang_total}
    return b


def jalan():
    with open(LAKIP, encoding="utf-8") as f:
        return {"rb": bangun(f.read())}


def cek():
    with open(LAKIP, encoding="utf-8") as f:
        teks = f.read()
    b = bangun(teks)
    d = b["data"]
    k = {x["komponen"]: x for x in d["komponen"]}
    assert len(k) == 22, f"komponen terurai {len(k)}, harus 22: {sorted(k)}"
    # RU sec 2.7
    for nama, hilang in (("Indeks Kualitas Kebijakan", 1.5), ("LAPOR tindak lanjut", 0.9), ("Sistem Merit", 1.22), ("Capaian IKU", 1.5)):
        assert abs(k[nama]["poin_hilang"] - hilang) < 1e-9, (nama, k[nama])
    assert k["Tata Kelola Pengadaan"]["tertimbang"] == 0.44 and k["Tata Kelola Pengadaan"]["bobot"] == 2
    assert k["Renaksi RB General"]["tertimbang"] == 2.42 and k["Renaksi RB General"]["bobot"] == 3  # bentuk "(bobot 3)"
    # jumlah bobot = jumlah yang tertulis per komponen (potret 77; catatan tidak merinci 23 bobot sisanya)
    tertulis = sum(_f(x) for x in re.findall(r"(?:dari|bobot) ([\d,]+)[,)]", next(x for x in teks.splitlines() if PENANDA in x)))
    assert abs(d["bobot_terinci"] - tertulis) < 1e-9 and abs(tertulis - 77) < 1e-9, (d["bobot_terinci"], tertulis)
    assert d["nilai_rb"] == 77.18 and abs(d["hilang_total"] - 22.82) < 1e-9 and abs(d["hilang_terinci"] - 19.03) < 1e-9, d
    assert abs(sum(x["tertimbang"] for x in d["komponen"]) - 57.97) < 1e-9
    # faktor: IKK dan IRH 1 (prioritas = poin hilang) teratas
    assert [x["komponen"] for x in d["komponen"][:2]] == ["Indeks Kualitas Kebijakan", "Indeks Reformasi Hukum"], d["komponen"][:3]
    assert k["Capaian IKU"]["pemilik"] is None and k["Tata Kelola Pengadaan"]["pemilik"] == "Biro SDM dan Umum"
    # yang ditolak: tertimbang > bobot, baris tak terurai, penanda hilang
    for rusak in (teks.replace("(0,44 dari 2)", "(2,44 dari 2)"), teks.replace("Opini BPK 3 (5 dari 5)", "Opini BPK tiga"), teks.replace(PENANDA, "X")):
        try:
            bangun(rusak)
            raise AssertionError("masukan rusak tidak ditolak")
        except ValueError:
            pass
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    s = json.dumps(b, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    print(f"ren1.py --cek: lulus (22 komponen, bobot {d['bobot_terinci']:g}, poin hilang {d['hilang_total']:.2f} dari 100, "
          f"{d['hilang_terinci']:.2f} di komponen bertabel)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
