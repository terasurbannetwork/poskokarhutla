"""KS-4 Kalender gladi pra-musim per kab/kota (DESAIN-TEKNIS sec 5.4; tiket RU-053).

Langkah jalan.py (bulanan). Masukan, tanpa menghitung ulang:
  public/data/bnpb/siaga.json        musim bahaya per kab (kab[k].musim[jenis].mulai, dibuat scripts/bnpb/siaga.py)
  public/data/bnpb/risiko_hvc.json   R per jenis (pemilih bahaya yang dilatih)
  public/data/bnpb/dibi_kab_tahun.json  kab x tahun x jenis, kode Kemendagri (kerangka skenario terburuk)
Aturan:
  bahaya_latih  = jenis bermusim di siaga.json dengan R tertinggi di risiko_hvc.json (gladi pra-musim hanya untuk bahaya
                  bermusim; bahaya R tertinggi yang tak bermusim, mis. gempa, ditulis di kolomnya sendiri)
  bulan_gladi   = 2 dan 1 bulan sebelum bulan awal musim (mulai November: September dan Oktober; mulai Januari:
                  November dan Desember tahun sebelumnya)
  skenario      = tahun DIBI terburuk kab untuk jenis itu, urut meninggal_hilang, lalu mengungsi, lalu rumah_rusak_berat
                  (DIBI per kab-tahun, bukan per kejadian: angka setahun)
Kab tanpa musim di siaga.json: tanpa saran (bukan bulan karangan).

  python3 -I scripts/bnpb/unit/ks4.py --cek
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

D = os.path.join(rapor.AKAR, "public", "data", "bnpb")
BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
LABEL_BAHAYA = "Asumsi: bahaya dilatih = bahaya bermusim ber-R tertinggi"
LABEL_R = "Asumsi: indeks R belum lulus uji balik"


def bulan_gladi(mulai):
    """Bulan awal musim 1-12 -> [2 bulan sebelum, 1 bulan sebelum] (1-12, melingkar ke tahun sebelumnya)."""
    if not isinstance(mulai, int) or not 1 <= mulai <= 12:
        return None
    return [(mulai - 3) % 12 + 1, (mulai - 2) % 12 + 1]


def terburuk(baris, kab, jenis):
    cocok = [b for b in baris if b["kab"] == kab and b["jenis"] == jenis]
    if not cocok:
        return None
    return max(cocok, key=lambda b: (b["meninggal_hilang"] or 0, b["mengungsi"] or 0, b["rumah_rusak_berat"] or 0, -b["tahun"]))


def skenario(w, jenis):
    if w is None:
        return f"belum ada catatan DIBI {jenis} di kab ini"
    n = lambda x: "belum ada data" if x is None else f"{x:,}".replace(",", ".")   # ribuan id-ID; kosong bukan 0
    return (f"{jenis} setara tahun {w['tahun']} (DIBI setahun): {n(w['kejadian'])} kejadian, {n(w['meninggal_hilang'])} orang meninggal atau hilang, "
            f"{n(w['mengungsi'])} jiwa mengungsi, {n(w['rumah_rusak_berat'])} rumah rusak berat")


def bangun(siaga, risiko, dibi, hari):
    if dibi.get("kode") != "kemendagri":
        raise ValueError("dibi_kab_tahun.json tanpa penanda kode=kemendagri")
    baris = [dict(zip(dibi["kolom"], b)) for b in dibi["baris"]]
    rows, tanpa = [], 0
    for kab in sorted(risiko["kab"]):
        r = risiko["kab"][kab]
        musim = ((siaga["kab"].get(kab) or {}).get("musim")) or {}
        if not musim:
            tanpa += 1
            continue
        jenis = max(musim, key=lambda j: (r["R"].get(j) or 0, j))
        g = bulan_gladi(musim[jenis].get("mulai"))
        if g is None:
            raise ValueError(f"{kab} {jenis}: bulan mulai {musim[jenis].get('mulai')!r} tidak sah")
        w = terburuk(baris, kab, jenis)
        rows.append({"kab": kab, "nama_kab": r.get("nama") or kab, "bahaya": jenis, "mulai": musim[jenis]["mulai"], "gladi": g,
                     "r_tertinggi": r.get("utama"), "terburuk": w and {x: w[x] for x in ("tahun", "kejadian", "meninggal_hilang", "mengungsi", "rumah_rusak_berat")},
                     "skenario": skenario(w, jenis)})
    bulan_ini = hari.month
    maju = lambda r: min((m - bulan_ini) % 12 for m in r["gladi"])   # bulan menuju gladi terdekat
    rows.sort(key=lambda r: (maju(r), r["kab"]))
    ini = [r for r in rows if bulan_ini in r["gladi"]]
    sumber_k = ["siaga", "risiko_hvc", "dibi_kab_tahun"]
    k1 = rapor.kartu(
        id="ks4-gladi", sistem="KS-4", pil="Gladi pra-musim", ikon="kalender", judul="Saran bulan gladi per kab/kota",
        angka=[{"k": "ini", "label": f"Kab/kota disarankan gladi bulan {BLN[bulan_ini - 1]}", "nilai": len(ini)},
               {"k": "saran", "label": "Kab/kota dengan saran", "nilai": len(rows)},
               {"k": "tanpa", "label": "Kab/kota tanpa musim di data siaga, tanpa saran", "nilai": tanpa}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "bahaya", "label": "Bahaya dilatih", "title": "jenis bermusim dengan R tertinggi"},
               {"k": "mulai", "label": "Awal musim", "title": "siaga.json: bulan awal musim (peluang bulanan logbook >= ambang musim)"},
               {"k": "gladi", "label": "Bulan gladi", "title": "2 dan 1 bulan sebelum awal musim"},
               {"k": "r_tertinggi", "label": "Bahaya R tertinggi", "title": "risiko_hvc.json utama, termasuk bahaya tak bermusim"},
               {"k": "skenario", "label": "Kerangka skenario terburuk", "title": "tahun DIBI terburuk: meninggal atau hilang, lalu mengungsi, lalu rumah rusak berat"}],
        baris=[{"kab": r["nama_kab"], "bahaya": r["bahaya"], "mulai": BLN[r["mulai"] - 1], "gladi": " dan ".join(BLN[m - 1] for m in r["gladi"]),
                "r_tertinggi": r["r_tertinggi"], "skenario": r["skenario"]} for r in rows],
        rumus="bulan gladi = awal musim - 2 dan awal musim - 1 (melingkar); skenario = tahun DIBI terburuk untuk bahaya itu",
        sumber=sumber_k, label=["resmi", "hitungan_kita"], asumsi=[LABEL_BAHAYA, LABEL_R], unduh="kalender_gladi.csv")
    kal = []
    for m in range(1, 13):
        kab_m = [r for r in rows if m in r["gladi"]]
        jenis = sorted({r["bahaya"] for r in kab_m})
        kal.append({"bulan": BLN[m - 1], "kab": len(kab_m), "bahaya": ", ".join(f"{j} {sum(r['bahaya'] == j for r in kab_m)} kab" for j in jenis) or None})
    k2 = rapor.kartu(
        id="ks4-kalender", sistem="KS-4", pil="Gladi pra-musim", ikon="kalender", judul="Kalender gladi 12 bulan",
        angka=[], kolom=[{"k": "bulan", "label": "Bulan"}, {"k": "kab", "label": "Kab/kota disarankan gladi", "angka": True},
                         {"k": "bahaya", "label": "Per bahaya"}],
        baris=kal, rumus="jumlah kab/kota yang bulan gladinya jatuh di bulan itu", sumber=sumber_k, label=["hitungan_kita"])
    sumber = [{"nama": "Siaga pra-musim (logbook Pusdalops BNPB, siaga.py)", "url": "repo:public/data/bnpb/siaga.json", "diambil": siaga["dibuat"][:10], "lisensi": "data internal BNPB, agregat"},
              {"nama": "Indeks risiko kab H x V / C (risiko_hvc.py)", "url": "repo:public/data/bnpb/risiko_hvc.json", "diambil": risiko["dibuat"][:10], "lisensi": risiko.get("atribusi") or "BNPB"},
              {"nama": "DIBI BNPB per kab-tahun", "url": "repo:public/data/bnpb/dibi_kab_tahun.json", "diambil": dibi["dibuat"][:10], "lisensi": dibi.get("lisensi") or "data publik DIBI"}]
    b = rapor.berkas([k1, k2], sumber)
    b["data"] = {"kab": rows, "tanpa_saran": tanpa, "bulan": hari.isoformat()[:7]}
    return b


def _muat(n):
    with open(os.path.join(D, n), encoding="utf-8") as f:
        return json.load(f)


def _hari_wib():
    return (datetime.now(timezone.utc) + timedelta(hours=7)).date()


def jalan():
    return {"kalender_gladi": bangun(_muat("siaga.json"), _muat("risiko_hvc.json"), _muat("dibi_kab_tahun.json"), _hari_wib())}


def cek():
    # RU sec 2.7: musim mulai November -> September dan Oktober; Januari -> November dan Desember tahun sebelumnya
    assert bulan_gladi(11) == [9, 10] and bulan_gladi(1) == [11, 12] and bulan_gladi(2) == [12, 1] and bulan_gladi(13) is None
    siaga = {"dibuat": "2026-11-01", "kab": {
        "0001": {"musim": {"banjir": {"mulai": 11}, "longsor": {"mulai": 1}}},
        "0002": {"musim": {}},                                   # tanpa musim: tanpa saran
        "0003": {"musim": {"banjir": {"mulai": 1}}}}}
    risiko = {"dibuat": "2026-11-26T00:00", "kab": {
        "0001": {"nama": "Kab. A", "utama": "gempa", "R": {"banjir": 0.4, "longsor": 0.9, "gempa": 2.0}},
        "0002": {"nama": "Kab. B", "utama": "banjir", "R": {"banjir": 0.5}},
        "0003": {"nama": "Kab. C", "utama": "banjir", "R": {"banjir": 0.1}},
        "0004": {"nama": "Kab. D", "utama": "banjir", "R": {"banjir": 0.1}}}}   # tidak ada di siaga: tanpa saran
    dibi = {"dibuat": "2026-11-26T00:00", "kode": "kemendagri",
            "kolom": ["kab", "tahun", "jenis", "kejadian", "meninggal_hilang", "luka", "terdampak", "mengungsi", "rumah_rusak_berat"],
            "baris": [["0001", 2019, "longsor", 3, 2, 0, 0, 50, 1], ["0001", 2021, "longsor", 5, 2, 0, 0, 1900, 0],
                      ["0001", 2022, "longsor", 9, 1, 0, 0, 5000, 40], ["0001", 2022, "banjir", 4, 9, 0, 0, 0, 0]]}
    b = bangun(siaga, risiko, dibi, date(2026, 11, 26))
    k = {r["kab"]: r for r in b["data"]["kab"]}
    assert set(k) == {"0001", "0003"} and b["data"]["tanpa_saran"] == 2, (k, b["data"]["tanpa_saran"])
    a = k["0001"]
    assert a["bahaya"] == "longsor" and a["r_tertinggi"] == "gempa" and a["gladi"] == [11, 12], a   # gempa tak bermusim
    assert a["terburuk"]["tahun"] == 2021, a["terburuk"]   # meninggal sama 2, mengungsi 1.900 > 50; 2022 meninggal 1
    assert k["0003"]["skenario"] == "belum ada catatan DIBI banjir di kab ini"
    k1 = b["kartu"][0]
    assert k1["angka"][0]["nilai"] == 2 and k1["baris"][0]["kab"] == "Kab. A" and k1["baris"][0]["gladi"] == "November dan Desember", k1["baris"]
    assert "1.900 jiwa mengungsi, 0 rumah rusak berat" in a["skenario"], a["skenario"]
    kal = {x["bulan"]: x for x in b["kartu"][1]["baris"]}
    assert kal["November"]["kab"] == 2 and kal["Desember"]["kab"] == 2 and kal["Juni"]["kab"] == 0 and kal["Juni"]["bahaya"] is None
    try:
        bangun(siaga, risiko, {**dibi, "kode": "bps"}, date(2026, 11, 26))
        raise AssertionError("DIBI berkode BPS tidak ditolak")
    except ValueError:
        pass
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    nyata = jalan()["kalender_gladi"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    n = nyata["kartu"][0]["angka"]
    print(f"ks4.py --cek: lulus ({n[1]['nilai']} kab/kota dengan saran, {n[0]['nilai']} gladi bulan ini, {n[2]['nilai']} tanpa musim)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
