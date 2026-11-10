#!/usr/bin/env python3
"""F3 Alarm beda sumber -> public/data/bnpb/beda_sumber.json (+ beda_sumber_arsip/YYYY-MM.jsonl, append-only).

Resmi (BMKG) lawan model (Centurisk97 / Open-Meteo) per kabupaten atau perairan x hari x bahaya, memakai beda_sumber_peta.json.
"perlu_dicek" bila peringkat 0-3 berbeda >= 2 atau (gelombang) rasio nilai > 2 (lantai 0,1 m): ambang awal, hipotesis (KEPUTUSAN Q3).
Satu sumber tidak ada pada hari itu = "tidak_dibandingkan", bukan "selaras". Tidak ada kolom "yang benar". Dihitung ulang tiap hari.
  hujan     : cuaca_bmkg_arsip_*.json (BMKG adm4, mm per kabupaten) lawan cuaca_prospektif_*.json (hanya kabupaten di atas ambang_catat yang
              tertulis; yang tidak tertulis berarti di bawah ambangnya, ditulis "<30" dan berperingkat 0), pada tanggal terbit terbaru yang ada di keduanya.
  gelombang : cuaca_maritim.json (hs BMKG dan `mod` model Open-Meteo, desimeter, tiga hari).
Pakai: python3 scripts/bnpb/silang/beda_sumber.py   |   python3 -I scripts/bnpb/silang/beda_sumber.py uji
Python 3.9 stdlib."""
import datetime as dt, glob, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, baca, hari_wib, simpan, tambah_arsip  # noqa: E402

BD = os.path.join(AKAR, "public/banjir/data")
PETA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "beda_sumber_peta.json")
KELUAR = os.path.join(AKAR, "public/data/bnpb/beda_sumber.json")
ARSIP = os.path.join(AKAR, "public/data/bnpb/beda_sumber_arsip")
WILAYAH = os.path.join(AKAR, "public/data/bnpb/wilayah.json")


BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def tgl_id(iso):
    """'2026-11-10' atau '2026-11-09T12:00:00Z' -> '10 Nov 2026' / '9 Nov 2026 pukul 19.00 WIB' (bahasa layar)."""
    if "T" in iso:
        d = dt.datetime.strptime(iso[:19], "%Y-%m-%dT%H:%M:%S") + dt.timedelta(hours=7 if iso.endswith("Z") else 0)
        return "%d %s %d pukul %s WIB" % (d.day, BLN[d.month - 1], d.year, d.strftime("%H.%M"))
    d = dt.date.fromisoformat(iso[:10])
    return "%d %s %d" % (d.day, BLN[d.month - 1], d.year)


def ang(n):
    return "{:,}".format(n).replace(",", ".")


def peringkat(peta, bahaya, nilai):
    """Peringkat 0-3 dari tabel peta: baris dengan `dari` terbesar yang <= nilai."""
    return max((r for r in peta["peringkat"] if r["bahaya"] == bahaya and r["dari"] <= nilai), key=lambda r: r["dari"])["peringkat"]


def banding(peta, bahaya, a, b, kontinu=False):
    """a, b = nilai (m atau mm) | None. -> (status, alasan, peringkat_a, peringkat_b)."""
    if a is None or b is None:
        return "tidak_dibandingkan", "salah satu sumber tidak ada pada hari itu", None, None
    amb = peta["ambang"]
    pa, pb = peringkat(peta, bahaya, a), peringkat(peta, bahaya, b)
    rasio = max(a, b) / max(min(a, b), amb["lantai_m"]) if kontinu else None
    if abs(pa - pb) >= amb["peringkat"]:
        return "perlu_dicek", "peringkat %d lawan %d, selisih %d (ambang %d, hipotesis awal)" % (pa, pb, abs(pa - pb), amb["peringkat"]), pa, pb
    if rasio is not None and rasio > amb["rasio"]:
        return "perlu_dicek", "nilai berbeda %s kali (ambang %s kali, lantai %s m)" % (("%.1f" % rasio).replace(".", ","), amb["rasio"], str(amb["lantai_m"]).replace(".", ",")) + " (hipotesis awal)", pa, pb
    return "selaras", "", pa, pb


def _b(sumber, lembaga, nilai, satuan, pr, diambil, teks=None):
    return {"sumber": sumber, "lembaga": lembaga, "nilai": nilai, "nilai_teks": teks, "satuan": satuan, "peringkat": pr, "diambil": diambil}


def hujan(peta, bmkg, pros, wilayah):
    """-> (baris perlu_dicek, hitung {status: n}, catatan). bmkg dan pros = isi satu berkas arsip bulanan."""
    sd = {}
    ht = {s: 0 for s in ("perlu_dicek", "selaras", "tidak_dibandingkan")}
    if not (bmkg and pros):
        return [], ht, ["hujan: arsip BMKG adm4 atau prospektif Centurisk97 tidak ada"]
    T = sorted(set(bmkg["terbit"]) & set(pros["terbit"]))
    if not T:
        return [], ht, ["hujan: tidak ada tanggal terbit yang sama di kedua arsip"]
    t = T[-1]
    eb, ep = bmkg["terbit"][t], pros["terbit"][t]
    am = pros["ambang_catat"]["mm"]
    nama = {k["kode"][:2] + "." + k["kode"][2:]: k for k in wilayah["kab"]}
    idx = {(k["prov"], k["nama"].lower()): kode for kode, k in nama.items()}
    model = {}
    tak, tak_prov = 0, set()
    for k, v in ep["kab"].items():
        p, _, nm = k.partition("|")
        kode = idx.get((p, nm.lower())) if nm and nm != "None" else None
        if kode:
            model[kode] = v
        else:
            tak += 1
            tak_prov.add(p)   # kabupaten model yang gagal dipasangkan: kabupaten BMKG di provinsi itu yang tidak tertulis tidak bisa dibaca "di bawah ambang"
    baris = []
    for kode, v in sorted(eb["kab"].items()):
        w = nama.get(kode)
        for i, tgl in enumerate(eb["hari"]):
            if i == 0:
                continue   # hari ke-0 prakiraan BMKG adm4 bisa parsial (item 3 jam yang sudah lewat hilang): dibandingkan mulai hari ke-1
            if tgl not in ep["hari"] or v[i][0] is None or (kode not in model and kode[:2] in tak_prov):
                ht["tidak_dibandingkan"] += 1
                continue
            mb = v[i][0]
            mm_model = model[kode][ep["hari"].index(tgl)][0] if kode in model else None
            nilai_m = mm_model if mm_model is not None else 0   # tidak tertulis (dan pasangannya terbaca) = di bawah ambang_catat: peringkat 0
            st, al, pa, pb = banding(peta, "hujan", mb, nilai_m)
            ht[st] += 1
            if st == "perlu_dicek":
                baris.append({"bahaya": "hujan", "tempat": {"jenis": "kab", "kode": kode, "nama": w["nama"] if w else kode, "prov": kode[:2]}, "hari": tgl,
                              "a": _b("BMKG prakiraan adm4", "BMKG", mb, "mm", pa, t), "b": _b("Centurisk97 prospektif", "Centurisk97", mm_model, "mm", pb, t, None if mm_model is not None else "<%d" % am),
                              "status": st, "alasan": al})
    return baris, ht, ["hujan: terbit %s; %s kabupaten model gagal dipasangkan ke daftar wilayah (termasuk nama kosong); kabupaten BMKG di provinsi itu yang tidak tertulis di model tidak dibandingkan, bukan dianggap di bawah ambang" % (tgl_id(t), ang(tak)),
                       "hujan: hari ke-0 tidak dibandingkan karena prakiraan adm4 BMKG pada hari terbitnya bisa parsial; perbandingan mulai hari ke-1",
                       "hujan: nilai BMKG adalah total harian satu desa wakil, nilai model adalah maksimum atas kecamatan di kabupaten itu; selisih sistematis tidak dikoreksi"]


def gelombang(peta, mar):
    baris = []
    ht = {s: 0 for s in ("perlu_dicek", "selaras", "tidak_dibandingkan")}
    if not mar:
        return baris, ht, ["gelombang: cuaca_maritim.json tidak ada"]
    for jenis in ("perairan", "pelabuhan"):
        for r in mar.get(jenis, []):
            for i, tgl in enumerate(mar["hari"]):
                hb, hm = r[5][i], r[9][i]
                a, b = (None if hb is None else hb / 10), (None if hm is None else hm / 10)
                st, al, pa, pb = banding(peta, "gelombang", a, b, kontinu=True)
                ht[st] += 1
                if st == "perlu_dicek":
                    baris.append({"bahaya": "gelombang", "tempat": {"jenis": jenis, "kode": r[0], "nama": r[1], "prov": r[2]}, "hari": tgl,
                                  "a": _b("BMKG maritim", "BMKG", a, "m", pa, mar["terbit"]), "b": _b("Open-Meteo Marine", "Centurisk97", b, "m", pb, mar["terbit"]), "status": st, "alasan": al})
    return baris, ht, ["gelombang: terbit BMKG %s; %s dari %s lokasi-hari tanpa nilai model tidak dibandingkan" % (tgl_id(mar["terbit"]), ang(ht["tidak_dibandingkan"]), ang(sum(ht.values())))]


def bangun(hari, peta, bmkg, pros, wilayah, mar):
    bh, hh, ch = hujan(peta, bmkg, pros, wilayah) if wilayah else ([], {"perlu_dicek": 0, "selaras": 0, "tidak_dibandingkan": 0}, ["wilayah.json tidak ada"])
    bg, hg, cg = gelombang(peta, mar)
    baris = sorted(bh + bg, key=lambda x: (-abs((x["a"]["peringkat"] or 0) - (x["b"]["peringkat"] or 0)), x["bahaya"], x["tempat"]["kode"], x["hari"]))
    per = {"hujan": hh, "gelombang": hg}
    return {"versi": 1, "dibuat": hari, "hari": hari, "ambang": peta["ambang"], "baris": baris,
            "ringkas": {"n_dibandingkan": sum(h["perlu_dicek"] + h["selaras"] for h in per.values()), "n_perlu_dicek": len(baris), "per_bahaya": per},
            "catatan": ch + cg + ["Baris hanya memuat yang perlu dicek; jumlah selaras dan tidak dibandingkan ada di ringkas.per_bahaya.",
                                  "Perlu dicek berarti dua sumber berbeda lewat ambang awal, bukan vonis; tidak ada sumber yang dinyatakan benar.",
                                  "Tanda dihitung ulang tiap hari. Tidak dibandingkan: " + "; ".join(r["bahaya"] + " (" + r["alasan"] + ")" for r in peta["tidak_dibandingkan"]) + "."]}


def baris_arsip(o):
    return {"dibuat": o["dibuat"], "n_dibandingkan": o["ringkas"]["n_dibandingkan"],
            "perlu_dicek": [[x["bahaya"], x["tempat"]["kode"], x["hari"], x["a"]["nilai"], x["b"]["nilai"]] for x in o["baris"]]}


def terbaru(pola):
    """Berkas bulanan terakhir yang cocok, digabung ke satu arsip {terbit: ...} (bulan lama tetap terbaca)."""
    gab = None
    for f in sorted(glob.glob(os.path.join(BD, pola))):
        d = baca(f)
        if d:
            gab = gab or dict(d, terbit={})
            gab["terbit"].update(d["terbit"])
    return gab


def main():
    hari = hari_wib()
    peta = baca(PETA)
    o = bangun(hari, peta, terbaru("cuaca_bmkg_arsip_20??-??.json"), terbaru("cuaca_prospektif_20??-??.json"), baca(WILAYAH), baca(os.path.join(BD, "cuaca_maritim.json")))
    simpan(KELUAR, o)
    baru = tambah_arsip(os.path.join(ARSIP, hari[:7] + ".jsonl"), hari, baris_arsip(o))
    print("beda_sumber: %s, arsip %s %s" % (o["ringkas"], hari, "ditambah" if baru else "sudah ada"), file=sys.stderr)


def uji():
    peta = baca(PETA)
    assert peringkat(peta, "hujan", 49.9) == 0 and peringkat(peta, "hujan", 50) == 1 and peringkat(peta, "hujan", 400) == 3 and peringkat(peta, "gelombang", 4) == 2
    assert banding(peta, "hujan", 120, 10)[0] == "perlu_dicek"   # peringkat 2 lawan 0
    assert banding(peta, "hujan", 60, 10)[0] == "selaras"        # peringkat 1 lawan 0
    assert banding(peta, "hujan", None, 10)[0] == "tidak_dibandingkan" and banding(peta, "gelombang", 1.0, None, True)[0] == "tidak_dibandingkan"
    assert banding(peta, "gelombang", 0.05, 0.5, True)[0] == "perlu_dicek"   # lantai 0,1: 0,5 / 0,1 = 5 kali
    assert banding(peta, "gelombang", 0.05, 0.12, True)[0] == "selaras"      # 0,12 / 0,1 = 1,2 kali; tanpa lantai akan 2,4 kali
    assert banding(peta, "gelombang", 1.0, 2.0, True)[0] == "selaras"        # tepat 2 kali bukan lebih dari 2
    assert banding(peta, "gelombang", 1.0, 2.6, True)[0] == "perlu_dicek"
    wil = {"kab": [{"kode": "1101", "prov": "11", "nama": "Aceh Selatan"}, {"kode": "1105", "prov": "11", "nama": "Aceh Barat"}, {"kode": "1106", "prov": "11", "nama": "Aceh Besar"},
                   {"kode": "1107", "prov": "11", "nama": "Aceh Tamiang"}, {"kode": "1201", "prov": "12", "nama": "Deli"}]}
    # hari ke-0 (1 Mar) tidak dibandingkan; yang dibandingkan hanya 2 Mar
    bm = {"terbit": {"2026-03-01": {"hari": ["2026-03-01", "2026-03-02"], "kab": {"11.01": [[999.0, 5], [120.0, 5]], "11.05": [[999.0, 5], [20.0, 5]], "11.06": [[5.0, 5], [None, 5]],
                                                                            "11.07": [[5.0, 5], [30.0, 5]], "12.01": [[5.0, 5], [5.0, 5]]}}}}
    pr = {"ambang_catat": {"mm": 30, "kmj": 45}, "terbit": {"2026-03-01": {"hari": ["2026-03-01", "2026-03-02"], "kab": {"11|Aceh Barat": [[999, 1, 0, 0, 0], [160, 1, 0, 0, 0]], "12|None": [[99, 1, 0, 0, 0], [0, 0, 0, 0, 0]]}}}}
    mar = {"terbit": "2026-03-01T00:00:00Z", "hari": ["2026-03-01", "2026-03-02"], "perairan": [["P.1", "Perairan Uji", "11", 1, 1, [5, 30], ["a", "a"], [1, 1], [1, 1], [None, 12]]], "pelabuhan": []}
    o = bangun("2026-03-01", peta, bm, pr, wil, mar)
    h = o["ringkas"]["per_bahaya"]["hujan"]
    # 2 Mar: Aceh Selatan BMKG 120 (peringkat 2) lawan model tidak tertulis (peringkat 0) -> perlu dicek; Aceh Barat 20 lawan 160 -> perlu dicek;
    # Aceh Tamiang 30 lawan tidak tertulis -> selaras; Aceh Besar nilai kosong -> tidak dibandingkan; Deli: model provinsi 12 gagal dipasangkan -> tidak dibandingkan, bukan 0
    assert h == {"perlu_dicek": 2, "selaras": 1, "tidak_dibandingkan": 2}, h
    g = o["ringkas"]["per_bahaya"]["gelombang"]
    # perairan 1 Mar: model tidak ada -> tidak dibandingkan; 2 Mar: 3,0 m lawan 1,2 m, peringkat 1 lawan 0 tetapi rasio 2,5 kali -> perlu dicek
    assert g == {"perlu_dicek": 1, "selaras": 0, "tidak_dibandingkan": 1}, g
    assert o["ringkas"]["n_perlu_dicek"] == len(o["baris"]) == 3 and o["ringkas"]["n_dibandingkan"] == 4
    teks = str(o).lower()
    assert "benar" not in " ".join(k for x in o["baris"] for k in list(x) + list(x["a"]) + list(x["b"])) and "pantau bencana" not in teks
    assert all("hipotesis awal" in x["alasan"] for x in o["baris"]) and all(r["label"] == "hipotesis" for r in peta["peringkat"])
    assert all(x["hari"] != "2026-03-01" for x in o["baris"] if x["bahaya"] == "hujan")
    assert all(x["a"]["lembaga"] and x["b"]["lembaga"] and x["a"]["diambil"] and x["alasan"] for x in o["baris"])
    assert o == bangun("2026-03-01", peta, bm, pr, wil, mar)   # deterministik
    with tempfile.TemporaryDirectory() as t:
        j = os.path.join(t, "2026-03.jsonl")
        assert tambah_arsip(j, "2026-03-01", baris_arsip(o)) and not tambah_arsip(j, "2026-03-01", {"x": 1}) and len(open(j).read().splitlines()) == 1
    assert tgl_id("2026-11-10") == "10 Nov 2026" and tgl_id("2026-11-09T12:00:00Z") == "9 Nov 2026 pukul 19.00 WIB" and ang(3090) == "3.090"
    assert not any("T12:00" in c or "2026-11" in c for c in o["catatan"])
    print("beda_sumber uji: ok", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
