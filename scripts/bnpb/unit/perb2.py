"""PERB-2 Perkiraan berjalan kerugian ekonomi langsung rumah (DESAIN-TEKNIS sec 6.1; riset/1 PERB-2; tiket RU-059).

Langkah jalan.py (bulanan). Kerugian_k = RB x c_rb + RS x c_rs + RR x c_rr, c = tarif stimulan Jam Aturan (60, 30, 15 juta;
berlabel asumsi). Masukan tahun berjalan: dibi_kejadian.json (365 hari terakhir, baris bencana != 0, kab_kode BPS dipetakan ke
Kemendagri lewat padanan_kab_dibi.petakan; kode tak terpetakan dihitung terpisah, tidak dibagi rata).
Label: batas bawah (kerugian non-rumah tidak tertangkap).

GERBANG JUJUR: sebelum angka rupiah tampil, tahun 2025 dihitung dari dibi_kab_tahun.json dan dibandingkan dengan angka resmi
LAKIP (pustaka/5-lakip.md, Rp51,3 triliun). Layak hanya bila kolom rusak sedang dan ringan 2025 ADA di berkas itu (RU-058, pemilik
`banjir`) DAN selisih <= 30%. Selain itu kartu menulis "belum layak" dan TIDAK menampilkan rupiah; jumlah rumah rusak (fakta DIBI)
tetap tampil. Proporsi lawan PDB hanya bila layak (penyebut PDB 2025 dari LAKIP; PDRB kab belum dipakai).

  python3 -I scripts/bnpb/unit/perb2.py --cek
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
sys.path.insert(0, os.path.join(AKAR, "scripts", "data"))
import padanan_kab_dibi as PAD  # noqa: E402

DATA = os.path.join(AKAR, "public", "data", "bnpb")
LAKIP = os.path.join(AKAR, "data", "kajian-bnpb", "pustaka", "5-lakip.md")
TAHUN_UJI = 2025
AMBANG_SELISIH = 0.30   # DT sec 6.1
JUTA_PER_TRILIUN = 1_000_000
ASUMSI = ["Asumsi: batas bawah, hanya rumah"]
ASUMSI_GAGAL = "Asumsi: belum lulus uji 2025"


def _rp_triliun(s):
    """'51,3' -> 51.3; '23.656,2' -> 23656.2 (titik ribuan, koma desimal)."""
    return float(s.replace(".", "").replace(",", "."))


def resmi_lakip(teks):
    """(kerugian 2025, PDB 2025) dalam juta rupiah dari catatan LAKIP; ValueError bila kalimatnya tak ada."""
    k = re.search(r"kerugian ekonomi langsung akibat bencana 2025 = \*\*Rp([\d.,]+) triliun\*\*", teks)
    p = re.search(r"PDB 2025 = Rp([\d.,]+) triliun", teks)
    if not k or not p:
        raise ValueError("angka kerugian ekonomi 2025 atau PDB 2025 tidak ditemukan di catatan LAKIP")
    return _rp_triliun(k.group(1)) * JUTA_PER_TRILIUN, _rp_triliun(p.group(1)) * JUTA_PER_TRILIUN


def biaya(rb, rs, rr, tarif):
    """Juta rupiah; None bila satu jenis tak ada (kosong tidak pernah jadi 0)."""
    if rb is None or rs is None or rr is None:
        return None
    return rb * tarif["RB"] + rs * tarif["RS"] + rr * tarif["RR"]


def gerbang(dibi, tarif, resmi_juta):
    """Hitung 2025 dari dibi_kab_tahun.json dan bandingkan dengan angka resmi. -> dict (lengkap, layak, alasan)."""
    kol = {k: i for i, k in enumerate(dibi["kolom"])}
    sedang, ringan = kol.get("rumah_rusak_sedang"), kol.get("rumah_rusak_ringan")
    lengkap = sedang is not None and ringan is not None
    rb = rs = rr = 0
    for b in dibi["baris"]:
        if b[kol["tahun"]] != TAHUN_UJI:
            continue
        rb += b[kol["rumah_rusak_berat"]] or 0
        if lengkap:
            rs += b[sedang] or 0
            rr += b[ringan] or 0
    hitung = rb * tarif["RB"] + rs * tarif["RS"] + rr * tarif["RR"]
    selisih = (hitung - resmi_juta) / resmi_juta
    layak = lengkap and abs(selisih) <= AMBANG_SELISIH
    if layak:
        alasan = None
    else:
        sebab = []
        if not lengkap:
            sebab.append("kolom rumah rusak sedang dan ringan belum ada di dibi_kab_tahun.json (RU-058), hitungan 2025 hanya rumah rusak berat")
        if abs(selisih) > AMBANG_SELISIH:
            sebab.append(f"selisih {selisih * 100:+.0f}% dari angka resmi melebihi batas {AMBANG_SELISIH * 100:.0f}%")
        alasan = "belum layak: " + "; ".join(sebab)
    return {"tahun": TAHUN_UJI, "lengkap": lengkap, "rb": rb, "rs": rs if lengkap else None, "rr": rr if lengkap else None,
            "hitung_juta": hitung, "resmi_juta": resmi_juta, "selisih": selisih, "layak": layak, "alasan": alasan}


def tahun_berjalan(kejadian, tarif, petakan, layak):
    """Per kab Kemendagri: RB, RS, RR dari baris DIBI bencana != 0 (rr_* hilang = 0 menurut catatan dibi_kejadian.json, kunci tak ada = 0).
    -> (kab {kode: {rb, rs, rr, kerugian_juta|None, nama}}, tak_terpetakan = jumlah baris)."""
    kab, tak = {}, 0
    for r in kejadian["kejadian"]:
        if r.get("bencana", 1) == 0:
            continue
        rb, rs, rr = r.get("rr_berat", 0), r.get("rr_sedang", 0), r.get("rr_ringan", 0)
        if not (rb or rs or rr):
            continue
        kode = petakan(str(r.get("kab_kode") or "").replace(".", ""))
        if kode is None:
            tak += 1
            continue
        x = kab.setdefault(kode, {"rb": 0, "rs": 0, "rr": 0, "nama": r.get("kab")})
        x["rb"] += rb
        x["rs"] += rs
        x["rr"] += rr
    for x in kab.values():
        x["kerugian_juta"] = biaya(x["rb"], x["rs"], x["rr"], tarif) if layak else None
    return kab, tak


def bangun(dibi, kejadian, tarif, lakip, nama, petakan=PAD.petakan):
    resmi, pdb = resmi_lakip(lakip)
    g = gerbang(dibi, tarif, resmi)
    kab, tak = tahun_berjalan(kejadian, tarif, petakan, g["layak"])
    jml = {k: sum(x[k] for x in kab.values()) for k in ("rb", "rs", "rr")}
    total = sum(x["kerugian_juta"] for x in kab.values()) if g["layak"] else None
    baris = [{"kab": nama.get(k) or x["nama"] or k, "rb": x["rb"], "rs": x["rs"], "rr": x["rr"],
              **({"kerugian": x["kerugian_juta"]} if g["layak"] else {})}
             for k, x in sorted(kab.items(), key=lambda kv: (-kv[1]["rb"], -kv[1]["rs"], kv[0]))]
    kolom = [{"k": "kab", "label": "Kab/kota"},
             {"k": "rb", "label": "Rumah rusak berat", "angka": True, "title": "rr_berat DIBI, baris kejadian yang masuk angka resmi, 365 hari terakhir"},
             {"k": "rs", "label": "Rumah rusak sedang", "angka": True, "title": "rr_sedang DIBI, 365 hari terakhir"},
             {"k": "rr", "label": "Rumah rusak ringan", "angka": True, "title": "rr_ringan DIBI, 365 hari terakhir"}]
    if g["layak"]:
        kolom.append({"k": "kerugian", "label": "Kerugian rumah, juta Rp", "angka": True, "desimal": 0,
                      "title": "RB x 60 + RS x 30 + RR x 15 juta (tarif stimulan, asumsi); batas bawah, kerugian non-rumah tidak tertangkap"})
    sedang_resmi = f"{g['hitung_juta'] / JUTA_PER_TRILIUN:,.1f}".replace(",", "x").replace(".", ",").replace("x", ".")
    k1 = rapor.kartu(
        id="perb2-kerugian", sistem="PERB-2", pil="Kerugian ekonomi", ikon="uang", judul="Kerugian rumah tahun berjalan",
        angka=[{"k": "rb", "label": "Rumah rusak berat, 365 hari terakhir", "nilai": jml["rb"]},
               {"k": "rs", "label": "Rumah rusak sedang", "nilai": jml["rs"]},
               {"k": "rr", "label": "Rumah rusak ringan", "nilai": jml["rr"]},
               {"k": "kerugian", "label": "Kerugian rumah, juta Rp (batas bawah)", "nilai": total, "desimal": 0,
                "title": g["alasan"] or "RB x 60 + RS x 30 + RR x 15 juta; batas bawah"},
               {"k": "gerbang", "label": f"Selisih hitungan {TAHUN_UJI} lawan angka resmi LAKIP (%)", "nilai": round(g["selisih"] * 100, 1), "desimal": 0,
                "title": f"hitungan {TAHUN_UJI} dari DIBI = Rp{sedang_resmi} triliun lawan Rp{resmi / JUTA_PER_TRILIUN:,.1f} triliun (LAKIP 2025); layak bila kolom lengkap dan selisih paling banyak {AMBANG_SELISIH * 100:.0f}%".replace(",", "x").replace(".", ",").replace("x", ".")},
               {"k": "proporsi", "label": "Kerugian rumah lawan PDB 2025 (%)", "nilai": round(total / pdb * 100, 4) if total is not None else None, "desimal": 3,
                "title": g["alasan"] or "penyebut PDB 2025 menurut LAKIP"},
               {"k": "tak_terpetakan", "label": "Baris DIBI dengan kode kab tak terpetakan", "nilai": tak,
                "title": "tidak dibagi rata ke kab lain; ditulis supaya selisih jumlah terbaca"}],
        kolom=kolom, baris=baris,
        rumus="kerugian kab = RB x c_rb + RS x c_rs + RR x c_rr (c = tarif stimulan Jam Aturan); tampil hanya bila hitungan 2025 selisih paling banyak 30% dari angka resmi",
        sumber=["dibi_kejadian", "dibi_kab_tahun", "lakip_2025", "jam_aturan"], label=["resmi", "hitungan_kita"], aturan=["tarif_stimulan_juta"],
        asumsi=ASUMSI + ([] if g["layak"] else [ASUMSI_GAGAL]), unduh="rumah_rusak_365_hari.csv")
    src = [{"nama": "DIBI BNPB, kejadian harian 365 hari (dibi_kejadian.json)", "url": "repo:public/data/dibi_kejadian.json", "diambil": str(kejadian.get("dibuat") or "2026-11-26")[:10],
            "lisensi": "data publik dasbor DIBI; syarat pakai tidak tertulis"},
           {"nama": "DIBI BNPB, kab x tahun (dibi_kab_tahun.json)", "url": "repo:public/data/bnpb/dibi_kab_tahun.json", "diambil": str(dibi.get("dibuat") or "2026-11-26")[:10],
            "lisensi": "data publik dasbor DIBI; syarat pakai tidak tertulis"},
           {"nama": "LAKIP BNPB 2025 (catatan baca), kerugian ekonomi dan PDB 2025", "url": "repo:data/kajian-bnpb/pustaka/5-lakip.md", "diambil": "2026-11-02",
            "lisensi": "dokumen publik BNPB"}]
    b = rapor.berkas([k1], src)
    b["data"] = {"label_wajib": "batas bawah, hanya rumah", "layak": g["layak"], "gerbang": g, "tarif_juta": tarif, "pdb_2025_juta": pdb,
                 "dari": kejadian.get("dari"), "sampai": kejadian.get("sampai"), "tak_terpetakan": tak, "total_juta": total,
                 "kab": {k: {x: v for x, v in d.items() if x != "nama"} for k, d in kab.items()}}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _nama():
    return {k: v["nama"] for k, v in _muat(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json")).items()}


def jalan():
    with open(LAKIP, encoding="utf-8") as f:
        lakip = f.read()
    return {"kerugian": bangun(_muat(os.path.join(DATA, "dibi_kab_tahun.json")), _muat(os.path.join(AKAR, "public", "data", "dibi_kejadian.json")),
                               jam.nilai("tarif_stimulan_juta"), lakip, _nama())}


def cek():
    tarif = {"RB": 60, "RS": 30, "RR": 15}
    assert resmi_lakip("kerugian ekonomi langsung akibat bencana 2025 = **Rp51,3 triliun**; PDB 2025 = Rp23.656,2 triliun;") == (51_300_000.0, 23_656_200_000.0)
    try:
        resmi_lakip("tanpa angka")
        raise AssertionError("catatan tanpa angka tidak ditolak")
    except ValueError:
        pass
    assert biaya(10, 20, 30, tarif) == 600 + 600 + 450 and biaya(10, None, 30, tarif) is None
    kolom = ["kab", "tahun", "jenis", "kejadian", "meninggal_hilang", "luka", "terdampak", "mengungsi", "rumah_rusak_berat"]
    dibi = {"kolom": kolom, "baris": [["1101", 2025, "banjir", 1, 0, 0, 0, 0, 100000], ["1101", 2024, "banjir", 1, 0, 0, 0, 0, 5]]}
    # RB 100.000 x 60 juta = Rp6 triliun lawan Rp51,3 triliun: kolom sedang dan ringan hilang -> belum layak, rupiah tidak tampil
    g = gerbang(dibi, tarif, 51_300_000.0)
    assert not g["layak"] and not g["lengkap"] and g["rs"] is None and g["hitung_juta"] == 6_000_000 and "RU-058" in g["alasan"] and g["selisih"] < -0.8, g
    # kolom lengkap, selisih 29% lolos, 31% gagal (batas inklusif 30%)
    kolom2 = kolom + ["rumah_rusak_sedang", "rumah_rusak_ringan"]
    mk = lambda rb: {"kolom": kolom2, "baris": [["1101", 2025, "banjir", 1, 0, 0, 0, 0, rb, 0, 0]]}  # noqa: E731
    assert gerbang(mk(int(51_300_000 * 0.71 / 60)), tarif, 51_300_000.0)["layak"]
    assert not gerbang(mk(int(51_300_000 * 0.69 / 60)), tarif, 51_300_000.0)["layak"]
    assert not gerbang(mk(int(51_300_000 * 1.40 / 60)), tarif, 51_300_000.0)["layak"]
    # tahun berjalan: bencana 0 tidak masuk, kode titik dipetakan, kode tak terpetakan dihitung terpisah, kab tanpa rumah rusak tidak muncul
    kej = {"dibuat": "2026-11-23", "dari": "2025-11-23", "sampai": "2026-11-23", "kejadian": [
        {"kab_kode": "11.10", "kab": "Bireuen", "rr_berat": 2, "rr_sedang": 3, "rr_ringan": 4},
        {"kab_kode": "11.10", "kab": "Bireuen", "rr_ringan": 10, "bencana": 0},
        {"kab_kode": "11.10", "kab": "Bireuen", "rr_berat": 1},
        {"kab_kode": "99.99", "kab": "Tak dikenal", "rr_berat": 7},
        {"kab_kode": "11.08", "kab": "Aceh Besar", "terdampak": 5}]}
    peta = {"1110": "1111"}.get
    kab, tak = tahun_berjalan(kej, tarif, peta, True)
    assert list(kab) == ["1111"] and tak == 1, (kab, tak)
    assert (kab["1111"]["rb"], kab["1111"]["rs"], kab["1111"]["rr"]) == (3, 3, 4) and kab["1111"]["kerugian_juta"] == 180 + 90 + 60
    assert tahun_berjalan(kej, tarif, peta, False)[0]["1111"]["kerugian_juta"] is None
    lakip = "kerugian ekonomi langsung akibat bencana 2025 = **Rp51,3 triliun**; PDB 2025 = Rp23.656,2 triliun;"
    b = bangun(dibi, kej, tarif, lakip, {"1111": "Kab. Bireuen"}, peta)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    k = b["kartu"][0]
    a = {x["k"]: x for x in k["angka"]}
    assert a["kerugian"]["nilai"] is None and a["proporsi"]["nilai"] is None and "belum layak" in a["kerugian"]["title"], a["kerugian"]
    assert "kerugian" not in [c["k"] for c in k["kolom"]] and all("kerugian" not in x for x in k["baris"]), "rupiah tampil saat belum layak"
    assert a["rb"]["nilai"] == 3 and a["gerbang"]["nilai"] < -80 and b["data"]["layak"] is False and k["baris"][0]["kab"] == "Kab. Bireuen"
    # layak: rupiah dan proporsi tampil
    dibi_ok = {"kolom": kolom2, "baris": [["1101", 2025, "banjir", 1, 0, 0, 0, 0, 500000, 400000, 300000]]}   # 30+12+4,5 = Rp46,5 triliun
    bl = bangun(dibi_ok, kej, tarif, lakip, {}, peta)
    al = {x["k"]: x for x in bl["kartu"][0]["angka"]}
    assert bl["data"]["layak"] and al["kerugian"]["nilai"] == 330 and al["proporsi"]["nilai"] is not None and "kerugian" in [c["k"] for c in bl["kartu"][0]["kolom"]]
    assert bl["kartu"][0]["baris"][0]["kab"] == "Bireuen" and "asumsi" in bl["kartu"][0]
    nyata = jalan()["kerugian"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    n = nyata["data"]
    assert n["layak"] is False and n["total_juta"] is None and n["tak_terpetakan"] >= 0
    a = {x["k"]: x["nilai"] for x in nyata["kartu"][0]["angka"]}
    assert a["kerugian"] is None and a["proporsi"] is None, "rupiah tampil padahal belum layak"
    print(f"perb2.py --cek: lulus (365 hari: RB {a['rb']}, RS {a['rs']}, RR {a['rr']} di {len(n['kab'])} kab; gerbang "
          f"{'layak' if n['layak'] else 'belum layak'}, hitungan 2025 selisih {a['gerbang']:+.0f}% dari angka resmi; {n['tak_terpetakan']} baris tak terpetakan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
