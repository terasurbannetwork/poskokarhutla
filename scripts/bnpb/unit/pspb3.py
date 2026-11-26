"""PSPB-3 Rapor indikator Sendai dan SDGs 11.b (DESAIN-TEKNIS sec 6.3; ALGORITMA sec 7.9; tiket RU-060).

Langkah jalan.py (bulanan). Indikator per 100.000 penduduk dari DIBI (hitungan kita):
  A-1 = (meninggal + hilang) per 100.000 penduduk, rata-rata bergulir 10 tahun (t-9 sampai t, t = tahun lengkap terakhir DIBI)
  B-1 = terdampak (kolom DIBI "menderita") per 100.000 penduduk, rata-rata bergulir yang sama
  C-1 = kerugian ekonomi langsung lawan PDB (%), dari PERB-2; KOSONG bila PERB-2 belum layak
  E-1 = tidak diisi mesin (strategi nasional bukan keluaran PSPB-1); E-2 = persen pemda ber-RPBD berlaku dari PSPB-1 (proksi)
Penduduk = terpapar.json `n` (Dukcapil, satu tahun) untuk SEMUA tahun, berlabel. Kab yang tidak pernah ada di DIBI 2015-2025 (kode tak
terpetakan): None, bukan 0. Kab yang ada di DIBI: tahun tanpa baris dihitung 0 kejadian (tidak tercatat), penyebut selalu 10 tahun.
Nasional: jumlah korban / jumlah penduduk kab yang berdata, bukan rata-rata rasio kab. Penduduk 0 atau kosong memberi None.
Definisi "terdampak" DIBI berbeda dari UNDRR: ditulis di title kolom, belum disetarakan.

  python3 -I scripts/bnpb/unit/pspb3.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

AKAR = rapor.AKAR
DATA = os.path.join(AKAR, "public", "data", "bnpb")
JENDELA = 10
SKALA = 100_000
BERLAKU = ("berlaku", "sesuai_3_2026")
ASUMSI = ["Asumsi: penduduk 2026 untuk semua tahun"]
ASUMSI_JENIS = ["Asumsi: 7 kelompok jenis, batas bawah"]
CATATAN_JENIS = "jenis bencana di luar 7 kelompok Data Informasi Bencana Indonesia (DIBI) dan kode kab yang tidak terpetakan tidak terhitung, jadi angka ini batas bawah"
TITLE_TERDAMPAK = "kolom 'menderita' DIBI; definisi berbeda dari definisi terdampak Kantor Perserikatan Bangsa-Bangsa untuk Pengurangan Risiko Bencana (UNDRR) dan belum disetarakan"


def penduduk(terpapar):
    """{kab: n} hanya n > 0; kosong atau nol tidak dipakai sebagai penyebut."""
    return {k: v["n"] for k, v in terpapar["kab"].items() if isinstance(v.get("n"), (int, float)) and v["n"] > 0}


def hitung(dibi, pend, tahun_akhir=None):
    """-> {tahun_akhir, tahun, kab: {kode: {a1, b1, md, td, n}}, nasional: {...}, per_tahun: {t: {md, td}}}.
    Jendela = tahun_akhir-9 .. tahun_akhir; kab tanpa satu pun baris DIBI di seluruh berkas: None."""
    kol = {k: i for i, k in enumerate(dibi["kolom"])}
    ada = {b[kol["kab"]] for b in dibi["baris"]}
    akhir = tahun_akhir or max(b[kol["tahun"]] for b in dibi["baris"])
    tahun = list(range(akhir - JENDELA + 1, akhir + 1))
    per, kab_tahun = {t: {"md": 0, "td": 0} for t in tahun}, {}
    for b in dibi["baris"]:
        t = b[kol["tahun"]]
        if t not in per:
            continue
        md, td = b[kol["meninggal_hilang"]] or 0, b[kol["terdampak"]] or 0
        x = kab_tahun.setdefault(b[kol["kab"]], [0, 0])
        x[0] += md
        x[1] += td
    kab = {}
    for k, n in pend.items():
        if k not in ada:
            kab[k] = {"a1": None, "b1": None, "md": None, "td": None, "n": n}
            continue
        md, td = kab_tahun.get(k, [0, 0])
        kab[k] = {"a1": md / JENDELA / n * SKALA, "b1": td / JENDELA / n * SKALA, "md": md, "td": td, "n": n}
    berdata = [x for x in kab.values() if x["a1"] is not None]
    for b in dibi["baris"]:
        t = b[kol["tahun"]]
        if t in per and b[kol["kab"]] in pend:   # hanya kab yang penduduknya diketahui, sama dengan penyebut nasional
            per[t]["md"] += b[kol["meninggal_hilang"]] or 0
            per[t]["td"] += b[kol["terdampak"]] or 0
    pn = sum(x["n"] for x in berdata)
    md_n, td_n = sum(x["md"] for x in berdata), sum(x["td"] for x in berdata)
    nas = {"penduduk": pn or None, "md": md_n, "td": td_n,
           "a1": md_n / JENDELA / pn * SKALA if pn else None, "b1": td_n / JENDELA / pn * SKALA if pn else None,
           "kab_berdata": len(berdata), "kab_tanpa_dibi": len(kab) - len(berdata)}
    return {"tahun_akhir": akhir, "tahun": tahun, "kab": kab, "nasional": nas, "per_tahun": per}


def e2(rpbd):
    """Persen pemda ber-RPBD berlaku dari yang bisa dicek (PSPB-1). -> (persen|None, berlaku, dicek, jumlah)."""
    pemda = (rpbd.get("data") or {}).get("pemda") or []
    dicek = [p for p in pemda if p.get("status") != "tidak_bisa_dicek"]
    ber = sum(1 for p in dicek if p["status"] in BERLAKU)
    return (100 * ber / len(dicek) if dicek else None), ber, len(dicek), len(pemda)


def bangun(dibi, terpapar, kerugian, rpbd, nama):
    h = hitung(dibi, penduduk(terpapar))
    nas = h["nasional"]
    layak = bool((kerugian.get("data") or {}).get("layak"))
    ang = {x["k"]: x["nilai"] for x in kerugian["kartu"][0]["angka"]}
    c1 = ang.get("proporsi") if layak else None
    pe2, ber, dicek, jml = e2(rpbd)
    r = lambda v, d=3: None if v is None else round(v, d)   # noqa: E731
    sampai = f"{h['tahun'][0]}-{h['tahun'][-1]}"
    k1 = rapor.kartu(
        id="pspb3-nasional", sistem="PSPB-3", pil="Indikator Sendai", ikon="hitung", judul="Indikator Sendai dan Tujuan Pembangunan Berkelanjutan 11.b",
        angka=[{"k": "a1", "label": f"A-1 korban jiwa per 100.000 penduduk, rata-rata {sampai}", "nilai": r(nas["a1"]), "desimal": 2,
                "title": f"(meninggal + hilang) rata-rata tahunan {sampai} / penduduk x 100.000; jumlah korban dibagi jumlah penduduk {nas['kab_berdata']} kab yang ada di DIBI; " + CATATAN_JENIS},
               {"k": "b1", "label": f"B-1 terdampak per 100.000 penduduk, rata-rata {sampai}", "nilai": r(nas["b1"]), "desimal": 0, "title": TITLE_TERDAMPAK + "; " + CATATAN_JENIS},
               {"k": "c1", "label": "C-1 kerugian rumah lawan produk domestik bruto (PDB) (%)", "nilai": r(c1, 2), "desimal": 2,
                "title": "dari PERB-2; kosong selama PERB-2 belum layak (hitungan 2025 belum lolos gerbang terhadap angka resmi Laporan Akuntabilitas Kinerja Instansi Pemerintah, LAKIP)" if not layak else "dari PERB-2, batas bawah (hanya rumah)"},
               {"k": "e1", "label": "E-1 strategi nasional", "nilai": None,
                "title": "tidak dihitung dari data pipeline; PSPB-1 hanya mendata dokumen daerah"},
               {"k": "e2", "label": f"E-2 pemda ber-RPBD berlaku (%), dari {dicek:,} yang bisa dinilai".replace(",", "."), "nilai": r(pe2, 1), "desimal": 1,
                "title": (f"RPBD = Rencana Penanggulangan Bencana Daerah. Proksi dari register Jaringan Dokumentasi dan Informasi Hukum (JDIH, PSPB-1): {ber:,} berlaku dari {dicek:,} yang bisa dicek; {jml - dicek:,} pemda tidak bisa dinilai. "
                          f"Rentang berlaku dari {jml:,} pemda: {100 * ber / jml:.1f}% sampai {100 * (ber + jml - dicek) / jml:.1f}% (bila semua yang tak bisa dinilai ternyata berlaku); bukan angka Sendai Monitor").replace(",", "x").replace(".", ",").replace("x", ".") if jml else "belum ada data"},
               {"k": "tanpa_dibi", "label": "Kab/kota tanpa data DIBI, tidak dihitung", "nilai": nas["kab_tanpa_dibi"],
                "title": "kab tidak punya baris DIBI 2015-2025: tidak ada kejadian tercatat atau kodenya belum terpetakan (tidak bisa dibedakan dari data ini); ditulis tidak ada data, bukan nol"}],
        kolom=[{"k": "tahun", "label": "Tahun"},
               {"k": "md", "label": "Meninggal dan hilang", "angka": True, "title": "jumlah DIBI semua jenis bencana, kab yang penduduknya diketahui"},
               {"k": "td", "label": "Terdampak", "angka": True, "title": TITLE_TERDAMPAK},
               {"k": "a1", "label": "A-1 tahun itu", "angka": True, "desimal": 2, "title": "korban per 100.000 penduduk 2026"},
               {"k": "b1", "label": "B-1 tahun itu", "angka": True, "desimal": 0, "title": "terdampak per 100.000 penduduk 2026"}],
        baris=[{"tahun": str(t), "md": v["md"], "td": v["td"],
                "a1": r(v["md"] / nas["penduduk"] * SKALA) if nas["penduduk"] else None,
                "b1": r(v["td"] / nas["penduduk"] * SKALA) if nas["penduduk"] else None} for t, v in h["per_tahun"].items()],
        rumus="indikator = korban / penduduk x 100.000; rata-rata bergulir 10 tahun (penyebut selalu 10); nasional = jumlah korban / jumlah penduduk kab berdata",
        sumber=["dibi_kab_tahun", "terpapar", "perb2_kerugian", "pspb1_rpbd"], label=["hitungan_kita", "proksi"], asumsi=ASUMSI + ASUMSI_JENIS)
    urut = sorted(h["kab"].items(), key=lambda kv: (kv[1]["a1"] is None, -(kv[1]["a1"] or 0), kv[0]))
    k2 = rapor.kartu(
        id="pspb3-kab", sistem="PSPB-3", pil="Indikator Sendai", ikon="orang", judul="A-1 dan B-1 per kab/kota",
        angka=[{"k": "kab", "label": "Kab/kota berdata", "nilai": nas["kab_berdata"]}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "n", "label": "Penduduk", "angka": True, "title": "Direktorat Jenderal Kependudukan dan Pencatatan Sipil (Dukcapil) per Okt 2026, dipakai untuk semua tahun"},
               {"k": "md", "label": f"Meninggal dan hilang {sampai}", "angka": True, "title": "jumlah 10 tahun"},
               {"k": "a1", "label": "A-1 per 100.000", "angka": True, "desimal": 2, "title": "rata-rata tahunan 10 tahun / penduduk x 100.000"},
               {"k": "b1", "label": "B-1 per 100.000", "angka": True, "desimal": 0, "title": TITLE_TERDAMPAK}],
        baris=[{"kab": nama.get(k) or k, "n": v["n"], "md": v["md"], "a1": r(v["a1"]), "b1": r(v["b1"])} for k, v in urut],
        rumus="A-1 = (jumlah meninggal + hilang 10 tahun / 10) / penduduk x 100.000; B-1 sama untuk terdampak",
        sumber=["dibi_kab_tahun", "terpapar"], label=["hitungan_kita"], asumsi=ASUMSI + ASUMSI_JENIS, unduh="indikator_sendai_kab.csv")
    src = [{"nama": "DIBI BNPB, kab x tahun (dibi_kab_tahun.json)", "url": "repo:public/data/bnpb/dibi_kab_tahun.json", "diambil": str(dibi.get("dibuat") or "2026-11-26")[:10],
            "lisensi": "data publik dasbor DIBI; syarat pakai tidak tertulis"},
           {"nama": "Penduduk Direktorat Jenderal Kependudukan dan Pencatatan Sipil (terpapar.json)", "url": "repo:public/data/bnpb/terpapar.json", "diambil": "2026-10-29", "lisensi": "layanan ArcGIS REST publik; syarat pakai tidak dinyatakan"},
           {"nama": "PERB-2 kerugian rumah dan PSPB-1 register Rencana Penanggulangan Bencana Daerah", "url": "repo:scripts/bnpb/unit/perb2.py", "diambil": "2026-11-26", "lisensi": "hitungan kita"}]
    b = rapor.berkas([k1, k2], src)
    b["data"] = {"label_wajib": "hitungan kita; terdampak DIBI bukan definisi UNDRR", "tahun_akhir": h["tahun_akhir"], "jendela": JENDELA, "nasional": nas,
                 "per_tahun": {str(t): v for t, v in h["per_tahun"].items()}, "c1": {"nilai": c1, "layak": layak}, "e1": None, "e2": {"persen": pe2, "berlaku": ber, "dicek": dicek, "pemda": jml},
                 "kab": {k: {x: (None if v[x] is None else round(v[x], 6) if isinstance(v[x], float) else v[x]) for x in ("a1", "b1", "md", "td", "n")} for k, v in h["kab"].items()}}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan(jaringan=True):
    import perb2
    import pspb1
    return {"sendai": bangun(_muat(os.path.join(DATA, "dibi_kab_tahun.json")), _muat(os.path.join(DATA, "terpapar.json")),
                             perb2.jalan()["kerugian"], pspb1.jalan(jaringan)["rpbd"], perb2._nama())}


def cek():
    kol = ["kab", "tahun", "jenis", "kejadian", "meninggal_hilang", "luka", "terdampak", "mengungsi", "rumah_rusak_berat"]
    dibi = {"kolom": kol, "baris": [["A", 2025, "banjir", 1, 50, 0, 1000, 0, 0], ["A", 2016, "banjir", 1, 50, 0, 3000, 0, 0], ["A", 2015, "banjir", 1, 999, 0, 999, 0, 0],
                                    ["B", 2025, "gempa", 1, 0, 0, 200, 0, 0], ["C", 2024, "banjir", 1, 5, 0, 0, 0, 0]]}
    # penduduk A 100.000, B 200.000 (ada di DIBI tanpa korban jiwa = 0 sungguhan), C tanpa penduduk, D tidak di DIBI (None), E penduduk 0
    pend = penduduk({"kab": {"A": {"n": 100000}, "B": {"n": 200000}, "C": {"n": None}, "D": {"n": 300000}, "E": {"n": 0}}})
    assert pend == {"A": 100000, "B": 200000, "D": 300000}
    h = hitung(dibi, pend)
    assert h["tahun"] == list(range(2016, 2026)) and h["tahun_akhir"] == 2025
    a = h["kab"]["A"]   # 2015 di luar jendela; (50 + 50) / 10 / 100000 x 100000 = 10
    assert a["md"] == 100 and abs(a["a1"] - 10) < 1e-9 and abs(a["b1"] - 400) < 1e-9, a
    assert h["kab"]["B"]["a1"] == 0 and h["kab"]["B"]["md"] == 0, "kab di DIBI tanpa korban jiwa = 0 sungguhan"
    assert h["kab"]["D"]["a1"] is None and h["kab"]["D"]["b1"] is None, "kab tanpa DIBI: None, bukan 0"
    n = h["nasional"]   # nasional = jumlah korban / jumlah penduduk A dan B, bukan rata-rata rasio kab
    assert n["penduduk"] == 300000 and n["md"] == 100 and abs(n["a1"] - 100 / 10 / 300000 * SKALA) < 1e-9 and n["kab_tanpa_dibi"] == 1 and n["kab_berdata"] == 2, n
    assert abs(n["a1"] - (10 + 0) / 2) > 1, "nasional bukan rata-rata rasio"
    assert h["per_tahun"][2025] == {"md": 50, "td": 1200} and h["per_tahun"][2016]["md"] == 50, "kab tanpa penduduk (C) tidak ikut"
    # penduduk kosong: tidak ada penyebut, nasional None
    kosong = hitung(dibi, {})
    assert kosong["nasional"]["a1"] is None and kosong["nasional"]["penduduk"] is None
    # E-2: tidak_bisa_dicek keluar dari penyebut; tanpa yang bisa dicek: None
    assert e2({"data": {"pemda": [{"status": "berlaku"}, {"status": "sesuai_3_2026"}, {"status": "habis"}, {"status": "tidak_bisa_dicek"}]}})[:3] == (100 * 2 / 3, 2, 3)
    assert e2({"data": {"pemda": [{"status": "tidak_bisa_dicek"}]}})[0] is None and e2({})[0] is None
    # bangun: C-1 kosong saat PERB-2 belum layak, terisi saat layak
    kart = lambda layak, p: {"data": {"layak": layak}, "kartu": [{"angka": [{"k": "proporsi", "nilai": p}]}]}   # noqa: E731
    rp = {"data": {"pemda": [{"status": "berlaku"}, {"status": "habis"}]}}
    b = bangun(dibi, {"kab": {"A": {"n": 100000}, "B": {"n": 200000}}}, kart(False, 0.2), rp, {"A": "Kab. A"})
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    ang = {x["k"]: x for x in b["kartu"][0]["angka"]}
    assert ang["c1"]["nilai"] is None and ang["e1"]["nilai"] is None and ang["e2"]["nilai"] == 50.0 and ang["tanpa_dibi"]["nilai"] == 0, ang
    assert "belum layak" in ang["c1"]["title"] and "UNDRR" in ang["b1"]["title"]
    assert bangun(dibi, {"kab": {"A": {"n": 100000}}}, kart(True, 0.2), rp, {})["kartu"][0]["angka"][2]["nilai"] == 0.2
    assert b["kartu"][1]["baris"][0]["kab"] == "Kab. A" and b["kartu"][0]["baris"][0]["tahun"] == "2016"
    nyata = jalan(jaringan=False)["sendai"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    d = nyata["data"]
    assert d["c1"]["nilai"] is None and d["c1"]["layak"] is False, "C-1 terisi padahal PERB-2 belum layak"
    nn = d["nasional"]
    assert 0 < nn["a1"] < 100 and nn["kab_berdata"] + nn["kab_tanpa_dibi"] == len(d["kab"]), nn
    assert all(v["a1"] is None for v in d["kab"].values() if v["md"] is None)
    print(f"pspb3.py --cek: lulus (A-1 nasional {nn['a1']:.2f} per 100.000 rata-rata {d['tahun_akhir'] - 9}-{d['tahun_akhir']}, B-1 {nn['b1']:.0f}; {nn['kab_berdata']} kab berdata, "
          f"{nn['kab_tanpa_dibi']} tanpa DIBI; C-1 kosong, E-2 {d['e2']['persen']:.1f}% dari {d['e2']['dicek']} yang bisa dicek)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
