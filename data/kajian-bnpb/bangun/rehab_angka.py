#!/usr/bin/env python3
"""Angka kajian rehab yang dihitung dari paket data (KERANGKA rehab §12). Luring, stdlib.

Kini: jembatan rusak DIBI per kejadian besar (Bab 3 P1, Gambar 3.2) dengan jendela, kategori, provinsi,
DAN kab yang sama persis dengan dibi/kejadian_besar.csv (dibi.baris_peristiwa dipakai ulang).
Uji diri: RB jendela = rumah_rusak_berat versi DIBI di kejadian_besar.csv, untuk TIAP kejadian berjendela.
Jalankan: python3 data/kajian-bnpb/bangun/rehab_angka.py
"""
import csv, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dibi  # noqa: E402

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def jembatan_per_kejadian():
    per = json.load(open(os.path.join(DATA, "dibi/mentah/dibi_peristiwa.json"), encoding="utf-8"))["peristiwa"]
    kb = {}
    for r in csv.DictReader(open(os.path.join(DATA, "dibi/kejadian_besar.csv"), encoding="utf-8")):
        if r["versi"] == "DIBI" and r["metrik"] in ("rumah_rusak_berat", "baris_dibi"):
            kb.setdefault(r["kode"], {})[r["metrik"]] = int(float(r["nilai"]))
    out, gagal = {}, []
    for kode, _, _, jendela, kat, prov, kabs in dibi.PERISTIWA:
        if not jendela:
            continue
        rows = dibi.baris_peristiwa(per, kode, jendela, kat, prov, kabs)
        rb = sum(r["rumah_rusak_berat"] or 0 for r in rows)
        harap = kb.get(kode, {}).get("rumah_rusak_berat", 0)   # tanpa baris RB = kejadian tanpa baris DIBI
        if rb != harap:
            gagal.append(f"{kode}: RB jendela {rb} != kejadian_besar.csv {harap}")
        out[kode] = {"rb": rb, "jembatan": sum(r["jembatan_rusak"] or 0 for r in rows), "baris": len(rows)}
    assert not gagal, "jendela tidak mereproduksi kejadian_besar.csv:\n  " + "\n  ".join(gagal)
    return out


def _f(x):
    return float(x) if x not in ("", None) else None


def lampiran():
    """Lampiran A (daftar perhatian RR per kab, rehab.perhatian.sementara.*), B (profil provinsi), D (rekap tahun).
    Aturan sama dengan Bab 3.6: (a) IRBI 2025 banjir, longsor, atau gempa >= batas kuintil (turunan.batas_kuintil);
    (c-proksi) rumah rusak total 2015-2025 DIBI >= kuartil atas atas 514 kab (nol ikut dihitung) dan > 0."""
    import math
    import turunan
    irbi = list(csv.DictReader(open(os.path.join(DATA, "irbi/irbi_kab_2025.csv"), encoding="utf-8")))
    rr = {}
    for fn in ("skenario-hidromet/dibi_kab_tahun.csv", "skenario-hidromet/dibi_geologi_kab_tahun.csv"):
        for r in csv.DictReader(open(os.path.join(DATA, fn), encoding="utf-8")):
            if 2015 <= int(r["tahun"]) <= 2025:
                rr[r["kode"]] = rr.get(r["kode"], 0) + float(r["rumah_rusak"] or 0)
    semua = sorted(rr.get(r["kode"], 0) for r in irbi)
    ambang = semua[math.floor(len(semua) * 3 / 4)]
    bahaya = ("banjir", "longsor", "gempabumi")
    b1 = {h: turunan.batas_kuintil([_f(r[h]) for r in irbi], 4) for h in bahaya}
    b2 = {h: turunan.batas_kuintil([_f(r[h]) for r in irbi], 3) for h in bahaya}
    kena = lambda r, b: [h for h in bahaya if _f(r[h]) is not None and _f(r[h]) >= b[h]]
    c = lambda r: rr.get(r["kode"], 0) > 0 and rr.get(r["kode"], 0) >= ambang
    kab = []
    for r in sorted(irbi, key=lambda r: r["kode"]):
        a1, a2 = kena(r, b1), kena(r, b2)
        if not (a2 and c(r)):
            continue
        nama_b = {"banjir": "banjir", "longsor": "longsor", "gempabumi": "gempa"}
        kab.append({"kode": r["kode"], "prov_nama": r["prov_nama"], "nama": r["nama_kepmendagri"] or r["nama"],
                    "banjir": r["banjir"], "longsor": r["longsor"], "gempabumi": r["gempabumi"],
                    "rumah_rusak_2015_2025": int(rr[r["kode"]]),
                    "bahaya_kelas_teratas": ", ".join(nama_b[h] for h in a1) or "–",
                    "daftar": "kelas teratas" if a1 else "dua kelas teratas"})
    n1 = sum(1 for k in kab if k["daftar"] == "kelas teratas")
    assert (n1, len(kab), int(ambang)) == (40, 73, 1596), f"daftar perhatian tidak sama dengan registri: {n1}, {len(kab)}, {ambang}"
    tulis("lampiran_rehab_kab.csv", kab)
    rows = [r for r in csv.DictReader(open(os.path.join(DATA, "dibi/rekap_provinsi_tahunan.csv"), encoding="utf-8"))
            if r["klasifikasi"] == "alam" and r["cakupan"] == "bencana"]
    pulau = {r["prov_nama"]: r["pulau"].replace("Bali–Nusa Tenggara", "Bali dan Nusa Tenggara") for r in irbi}  # glosarium terlarang
    nkab = {}
    for k in kab:
        if k["daftar"] == "kelas teratas":
            nkab[k["prov_nama"]] = nkab.get(k["prov_nama"], 0) + 1
    prov = {}
    for r in rows:
        t, p = int(r["tahun"]), r["provinsi"]
        d = prov.setdefault(p, {"provinsi": p, "pulau": pulau.get(p, ""), "rb": 0, "rs": 0, "rr": 0, "jembatan_2018_2025": 0,
                                "jembatan_2025": 0, "fasum": 0})
        if 2015 <= t <= 2025:
            d["rb"] += float(r["rumah_rusak_berat"] or 0); d["rs"] += float(r["rumah_rusak_sedang"] or 0)
            d["rr"] += float(r["rumah_rusak_ringan"] or 0); d["fasum"] += float(r["fasum_rusak"] or 0)
        if 2018 <= t <= 2025:
            d["jembatan_2018_2025"] += float(r["jembatan_rusak"] or 0)
        if t == 2025:
            d["jembatan_2025"] += float(r["jembatan_rusak"] or 0)
    out = []
    for d in sorted(prov.values(), key=lambda d: -d["jembatan_2018_2025"]):
        d = {k: (int(v) if isinstance(v, float) else v) for k, v in d.items()}
        d["kab_perhatian"] = nkab.get(d["provinsi"], 0)
        out.append(d)
    jml = {k: sum(d[k] for d in out) for k in ("rb", "jembatan_2018_2025", "fasum", "jembatan_2025")}
    assert jml == {"rb": 301311, "jembatan_2018_2025": 3833, "fasum": 21703, "jembatan_2025": 1088}, jml
    assert not [d["provinsi"] for d in out if not d["pulau"]], "provinsi tanpa pulau"
    tulis("lampiran_rehab_prov.csv", out)
    nas = [r for r in csv.DictReader(open(os.path.join(DATA, "dibi/rekap_nasional_tahunan.csv"), encoding="utf-8"))
           if r["klasifikasi"] == "alam" and r["cakupan"] == "bencana"]
    th = {}
    for r in nas:
        t = int(r["tahun"])
        if 2015 <= t <= 2025:
            d = th.setdefault(t, {"tahun": str(t), "kejadian": 0, "rb": 0, "rs": 0, "rr": 0, "jembatan": 0, "fasum": 0, "fasyankes": 0})
            for k, col in (("kejadian", "kejadian"), ("rb", "rumah_rusak_berat"), ("rs", "rumah_rusak_sedang"), ("rr", "rumah_rusak_ringan"),
                           ("jembatan", "jembatan_rusak"), ("fasum", "fasum_rusak"), ("fasyankes", "fasyankes_rusak")):
                d[k] += float(r[col] or 0)
    th = [{k: (round(v) if isinstance(v, float) else v) for k, v in d.items()} for _, d in sorted(th.items())]
    assert sum(d["rb"] for d in th) == 301311 and sum(d["jembatan"] for d in th) == 3833
    tulis("lampiran_rehab_tahun.csv", th)
    return n1, len(kab), len(out)


def tulis(nama, rows):
    p = os.path.join(DATA, "turunan", nama)
    with open(p, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    j = jembatan_per_kejadian()
    # nilai yang dikutip bab-03 (bukti dan registri rehab.dibi.jembatan_rusak.*); berubah = prosa basi
    dikutip = {"sumatra2025": 726, "seroja2021": 95, "jabodetabek2020": 33, "ambon2019": 10, "semeru2021": 9,
               "sulteng2018": 7, "sulbar2021": 7, "cianjur2022": 2, "demak2024": 0, "lombok2018": 0}
    beda = {k: (v, j[k]["jembatan"]) for k, v in dikutip.items() if j[k]["jembatan"] != v}
    assert not beda, f"jembatan per kejadian berubah (dikutip, hitung): {beda}"
    for k, v in sorted(j.items(), key=lambda x: -x[1]["jembatan"]):
        print(f"{k:16} jembatan {v['jembatan']:5}  RB {v['rb']:7}  baris {v['baris']}")
    print(f"uji diri lolos: RB {len(j)} kejadian = kejadian_besar.csv; 10 nilai jembatan bab-03 cocok")
    n1, n2, np_ = lampiran()
    print(f"lampiran: {n1} kab daftar perhatian ({n2} dengan dua kelas), {np_} provinsi; jumlah = registri")
