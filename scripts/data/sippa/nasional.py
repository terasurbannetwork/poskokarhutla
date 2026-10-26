#!/usr/bin/env python3
"""SIPPA SP-022: kit per provinsi (18 provinsi, gambut/mineral) dari luas terbakar puncak SiPongi.

Masukan : public/data/luas_resmi.json   (ha per provinsi per tahun)
Keluaran: data/sippa/keluaran/kit_nasional.json (DT 3.1.5; PRD 5.2)
Pakai   : python3 nasional.py [--keluar DIR]   |   python3 nasional.py uji
Python 3.12 stdlib. Rencana bersyarat (hanya setelah G5), bukan pengadaan. Tanpa cap waktu: lari ulang identik byte demi byte.
"""
import json, math, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
LUAS = os.path.join(AKAR, "public", "data", "luas_resmi.json")
KEL = os.path.join(AKAR, "data", "sippa", "keluaran")
HA_PER_KIT = 22700                    # asumsi-kebijakan, kepekaan +-50% di Bab 18.7
TAHUN_PUNCAK = ("2019", "2023")       # PRD 5.2: maksimum 2019 atau 2023
MIN_HA = 10000                        # PRD 5.2: puncak >= 10.000 ha wajib >= 1 kit
NAIK_GAMBUT = 0.45                    # pecahan >= ini naik untuk gambut (asumsi-kebijakan; Jambi 2,49 -> 3 seperti tabel PRD 5.2)
# Kelompok dari PRD 5.2. Kode: 16 Sumsel 62 Kalteng 63 Kalsel 61 Kalbar 14 Riau 64 Kaltim 15 Jambi 18 Lampung
GAMBUT = ("16", "62", "63", "61", "14", "64", "15", "18")
MINERAL = ("93", "53", "52", "35", "81", "74", "73", "72", "32", "33")
LABEL = "rencana bersyarat, bukan pengadaan"


def jumlah_kit(ha, gambut):
    """Bulat terdekat (setengah naik); gambut naik dari pecahan NAIK_GAMBUT; provinsi terdaftar minimal 1 kit."""
    n = math.floor(ha / HA_PER_KIT + (1 - NAIK_GAMBUT if gambut else 0.5))
    return max(n, 1)


def puncak(ha_prov, tahun):
    v = {t: ha_prov[tahun.index(t)] for t in TAHUN_PUNCAK}
    t = max(v, key=lambda k: (v[k], -int(k)))
    return v[t], int(t)


def hitung(data):
    assert all(t in data["tahun"] for t in TAHUN_PUNCAK), "luas_resmi.json tanpa 2019/2023"
    baris = []
    for kel, daftar in (("gambut", GAMBUT), ("mineral", MINERAL)):
        for p in daftar:
            assert p in data["ha"], f"provinsi {p} tidak ada di luas_resmi.json"
            ha, th = puncak(data["ha"][p], data["tahun"])
            baris.append({"prov": p, "kelompok": kel, "luas_puncak_ha": round(ha), "tahun_puncak": th,
                          "kit": jumlah_kit(ha, kel == "gambut"), "musim_banjir_pasangan": kel == "gambut"})
    baris.sort(key=lambda b: (b["kelompok"] != "gambut", -b["kit"], b["prov"]))
    return {"skema": "kit_nasional/1", "label": LABEL,
            "ha_per_kit": {"nilai": HA_PER_KIT, "keyakinan": "asumsi-kebijakan"},
            "puncak": "maksimum 2019 atau 2023, SiPongi indikasi luas kebakaran (bukan citra)",
            "pembulatan": {"gambut_naik_dari_pecahan": NAIK_GAMBUT, "keyakinan": "asumsi-kebijakan"},
            "musim_banjir_pasangan_catatan": "menunggu: DIBI belum dipasang; true = provinsi gambut (KB 4.7)",
            "total": sum(b["kit"] for b in baris), "gambut": sum(b["kit"] for b in baris if b["kelompok"] == "gambut"),
            "n_provinsi": len(baris), "baris": baris}


def uji():
    ha = HA_PER_KIT
    assert jumlah_kit(0, False) == 1 and jumlah_kit(0, True) == 1, "minimal 1"
    assert jumlah_kit(1.5 * ha, False) == 2 and jumlah_kit(1.49 * ha, False) == 1, "mineral bulat terdekat"
    assert jumlah_kit(2.45 * ha, True) == 3 and jumlah_kit(2.44 * ha, True) == 2, "ambang gambut 0,45"
    th = ["2018", "2019", "2023"]
    assert puncak([5, 9, 7], th) == (9, 2019) and puncak([5, 7, 7], th) == (7, 2019) and puncak([5, 7, 8], th) == (8, 2023)
    with open(LUAS) as h:
        d = json.load(h)
    r = hitung(d)
    assert r == hitung(d), "tidak deterministik"
    b = r["baris"]
    assert len(b) == 18 and len({x["prov"] for x in b}) == 18, f"{len(b)} provinsi, perlu 18 unik"
    assert all(x["kit"] >= 0 for x in b), "kit negatif"
    assert r["total"] == sum(x["kit"] for x in b), "jumlah != total"
    assert r["gambut"] == sum(x["kit"] for x in b if x["kelompok"] == "gambut"), "gambut != jumlah baris gambut"
    assert (r["total"], r["gambut"]) == (81, 56), f"total {r['total']} gambut {r['gambut']}, perlu 81 dan 56 (PRD 5.2)"
    for x in b:
        if x["luas_puncak_ha"] >= MIN_HA:
            assert x["kit"] >= 1, f"{x['prov']} puncak {x['luas_puncak_ha']} ha tanpa kit"
    assert r["ha_per_kit"]["keyakinan"] == "asumsi-kebijakan" and "bukan pengadaan" in r["label"]
    k = next(x for x in b if x["prov"] == "62")          # contoh DT 3.1.5
    assert (k["kit"], k["luas_puncak_ha"], k["tahun_puncak"]) == (14, 317749, 2019), k
    try:
        hitung({"tahun": d["tahun"], "ha": {}})
    except AssertionError:
        pass
    else:
        raise SystemExit("provinsi hilang tidak ditolak")
    print(f"uji nasional.py hijau: {r['total']} kit, gambut {r['gambut']}")


def main(arg):
    keluar = arg[arg.index("--keluar") + 1] if "--keluar" in arg else KEL
    with open(LUAS) as h:
        r = hitung(json.load(h))
    os.makedirs(keluar, exist_ok=True)
    p = os.path.join(keluar, "kit_nasional.json")
    with open(p + ".tmp", "w") as h:
        h.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")))
    os.replace(p + ".tmp", p)
    print(f"kit_nasional.json: {r['n_provinsi']} provinsi, total {r['total']}, gambut {r['gambut']}")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
