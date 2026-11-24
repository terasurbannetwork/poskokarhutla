"""Uji prospektif abrasi (KI-25). Python stdlib saja.

Tiap jalan abrasi.py membekukan, per transek, perubahan garis pantai tahun BERIKUTNYA = laju regresi x 1 tahun, ke
public/pesisir/data/abrasi_prospektif.json (append-only: baris tak pernah ditulis ulang; berkas yang menyusut atau
barisnya berubah DITOLAK). Begitu komposit tahun ramalan ada, skor: MAE model lawan persistensi (perubahan teramati
tahun dasar), selisih berpasangan dengan bootstrap blok (blok = situs|desa).

VONIS (dikunci di abrasi_prospektif.kriteria.json + abrasi_prospektif.sidik, ditulis sebelum skor apa pun):
  belum_cukup_data  baris teruji < 30 atau blok < 5
  lolos             model mengalahkan DUA pembanding: selang 95% (MAE_persistensi - MAE_model) DAN
                    (MAE_tanpa_perubahan - MAE_model) keduanya seluruhnya > 0
  gagal             selain itu (salah satu pembanding menang atau seri, selang memuat nol)
Pembanding: persistensi = perubahan teramati tahun dasar; tanpa perubahan = ramalan delta 0 (garis pantai diam).
AMANDEMEN sebelum skor pertama, 25 Nov 2026, alasan: pemeriksa bersih (pembanding tunggal persistensi terlalu lemah; kode
pembanding/gerbang/sidik ikut dikunci). Sah karena n=0, .sidik belum di-commit, belum ada .buka.
Hanya 'lolos' yang membuka boleh_tampil di public/data/gerbang/pesisir.json (gagal-tertutup). Belum dikoreksi pasang surut.

  python3 -I scripts/pesisir/abrasi_prospektif.py kunci    tulis .sidik (sekali; menolak menimpa)
  python3 -I scripts/pesisir/abrasi_prospektif.py jalan    bekukan dari abrasi.json, skor, tulis gerbang
  python3 -I scripts/pesisir/abrasi_prospektif.py uji
"""
import datetime as dt
import json
import os
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
for p in ("scripts/umum", "scripts/pesisir"):
    sys.path.insert(0, os.path.join(AKAR, p))
import gerbang as G  # noqa: E402
import pembanding as P  # noqa: E402
import sidik as S  # noqa: E402

ARSIP = os.path.join(AKAR, "public/pesisir/data/abrasi_prospektif.json")
ABRASI = os.path.join(AKAR, "public/pesisir/data/abrasi.json")
KRITERIA = "scripts/pesisir/abrasi_prospektif.kriteria.json"   # relatif akar: sidik mencatat jalur relatif
SIDIK = "scripts/pesisir/abrasi_prospektif.sidik"
KODE = ["scripts/pesisir/abrasi_prospektif.py", "scripts/umum/pembanding.py", "scripts/umum/gerbang.py", "scripts/umum/sidik.py"]


def kriteria():
    return json.load(open(os.path.join(AKAR, KRITERIA)))


def bekukan(transek, tanggal):
    """Baris beku untuk tiap transek yang punya tahun Y (terakhir) dan Y-1. Tanpa gangguan, tanpa laju = dilewati."""
    out = []
    for t in transek:
        j = dict(map(tuple, t["jarak"]))
        if t.get("gangguan") or t.get("laju") is None or not j:
            continue
        y = max(j)
        if y - 1 not in j:
            continue
        out.append({"id": t["id"], "blok": f"{t['situs']}|{t.get('desa') or '-'}", "tahun_dasar": y, "ramalan_tahun": y + 1,
                    "pos_dasar": j[y], "pos_sebelum": j[y - 1], "laju": t["laju"], "ci95": t["ci95"],
                    "pred_delta": round(t["laju"], 2), "persist_delta": j[y] - j[y - 1], "dibekukan": tanggal})
    return out


def gabung(lama, baru):
    """lama + baris baru yang kuncinya (id, tahun_dasar) belum ada. Tidak mengubah baris lama."""
    ada = {(r["id"], r["tahun_dasar"]) for r in lama}
    return lama + [r for r in baru if (r["id"], r["tahun_dasar"]) not in ada]


def jaga(lama, calon):
    """Tolak berkas yang menyusut atau yang barisnya berubah/berpindah."""
    if len(calon) < len(lama):
        raise RuntimeError(f"abrasi_prospektif: arsip menyusut {len(lama)} -> {len(calon)} baris; append-only, ditolak")
    for i, r in enumerate(lama):
        if calon[i] != r:
            raise RuntimeError(f"abrasi_prospektif: baris {i} ({r['id']} {r['tahun_dasar']}) berubah; append-only, ditolak")


def skor(baris, transek, k):
    """Nilai baris beku yang tahun ramalannya sudah ada di `transek`. Keluaran {n, n_blok, mae_model, mae_pers, selisih, selang95, vonis, dilewati}."""
    td = {t["id"]: t for t in transek}
    data, lewat = [], 0
    for r in baris:
        t = td.get(r["id"])
        j = dict(map(tuple, t["jarak"])) if t else {}
        if r["ramalan_tahun"] not in j:
            continue   # belum ada citra tahun ramalan: bukan kegagalan, belum diuji
        if t.get("gangguan") or r["ramalan_tahun"] in (t.get("tinjau") or []) or r["ramalan_tahun"] in (t.get("artefak") or []):
            lewat += 1
            continue
        amati = j[r["ramalan_tahun"]] - r["pos_dasar"]
        em, ep = abs(r["pred_delta"] - amati), abs(r["persist_delta"] - amati)
        data.append({"blok": r["blok"], "em": em, "ep": ep, "en": abs(amati), "sel": ep - em, "seln": abs(amati) - em})
    n, blok = len(data), len({d["blok"] for d in data})
    o = {"n": n, "n_blok": blok, "dilewati_tinjau": lewat, "mae_model": None, "mae_pers": None, "mae_nol": None, "selisih": None, "selisih_nol": None, "selang95": None, "selang95_nol": None}
    if n:
        o["mae_model"], o["mae_pers"] = sum(d["em"] for d in data) / n, sum(d["ep"] for d in data) / n
        o["mae_nol"] = sum(d["en"] for d in data) / n
        o["selisih"] = o["mae_pers"] - o["mae_model"]
        o["selisih_nol"] = o["mae_nol"] - o["mae_model"]
    if n < k["n_min"] or blok < k["blok_min"]:
        o["vonis"] = "belum_cukup_data"
        return o
    c, cn = [P.bootstrap_blok(lambda rs: sum(r[f] for r in rs) / len(rs), data, "blok", B=k["bootstrap"]["B"], seed=k["bootstrap"]["biji"])
             for f in ("sel", "seln")]
    o["selang95"] = None if c["lo"] is None else [c["lo"], c["hi"]]
    o["selang95_nol"] = None if cn["lo"] is None else [cn["lo"], cn["hi"]]
    o["vonis"] = "lolos" if all(x["lo"] is not None and x["lo"] > 0 for x in (c, cn)) else "gagal"
    return o


def entri_gerbang(h):
    sumber = ["public/pesisir/data/abrasi_prospektif.json"]
    if h["n"] == 0:
        return G.kosong("MAE perubahan garis pantai setahun (m)", "belum ada tahun ramalan yang citranya tersedia; baris beku menunggu komposit tahun berikutnya",
                        sumber, "persistensi (perubahan teramati tahun dasar)")
    # entri memuat pembanding yang LEBIH KUAT (MAE lebih kecil); vonis tetap dari kedua pembanding
    nol = h["mae_nol"] < h["mae_pers"]
    pemb, mae, sel = (("tanpa perubahan (ramalan delta 0)", h["mae_nol"], h["selang95_nol"]) if nol
                      else ("persistensi (perubahan teramati tahun dasar)", h["mae_pers"], h["selang95"]))
    return G.entri_ringkas("MAE perubahan garis pantai setahun (m)", "rendah", pemb, h["n"], h["mae_model"], mae, sel,
                           sumber, vonis=h["vonis"], prospektif=True, n_blok=h["n_blok"],
                           pembanding_kedua=("persistensi" if nol else "tanpa perubahan"))


def jalan(abrasi=None, tanggal=None):
    """Bekukan + skor + tulis. `abrasi` = isi abrasi.json (None: baca berkas). Mengembalikan hasil skor."""
    ab = abrasi or json.load(open(ABRASI))
    tanggal = tanggal or dt.date.today().isoformat()
    k = kriteria()
    try:
        lama = json.load(open(ARSIP))["baris"]
    except FileNotFoundError:
        lama = []
    calon = gabung(lama, bekukan(ab["transek"], tanggal))
    jaga(lama, calon)
    h = skor(calon, ab["transek"], k)
    if h["n"]:
        _cek_sidik()   # skor hanya bila kriteria dan kode masih yang dikunci
    out = {"dibuat": tanggal, "versi": 1, "catatan": "Append-only: baris beku tidak pernah ditulis ulang. Belum dikoreksi pasang surut. Kriteria dikunci di abrasi_prospektif.sidik.",
           "baris": calon, "nilai": h}
    tmp = ARSIP + ".tmp"
    json.dump(out, open(tmp, "w"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, ARSIP)
    tulis_gerbang({"abrasi_prakiraan_setahun": entri_gerbang(h)})
    return h


def tulis_gerbang(entri):
    """Gabung ke gerbang/pesisir.json: hanya kunci `entri` diganti, entri lain bertahan (G.tulis menimpa seluruh berkas)."""
    try:
        ada = json.load(open(G.jalur("pesisir")))["keluaran"]
    except (FileNotFoundError, KeyError, ValueError):
        ada = {}
    G.tulis("pesisir", {**ada, **entri})


def _cek_sidik():
    asal = os.getcwd()
    try:
        os.chdir(AKAR)
        S.cek(SIDIK)
    finally:
        os.chdir(asal)


def kunci():
    asal = os.getcwd()
    try:
        os.chdir(AKAR)
        d = S.tulis(SIDIK, KODE, KRITERIA, [])
    finally:
        os.chdir(asal)
    print("sidik", d["sidik"])


def uji():
    def tr(i, blok, laju, jarak, **x):
        return {"id": f"s-{i}", "situs": "s", "desa": blok, "laju": laju, "ci95": [laju - 1, laju + 1], "jarak": jarak, **x}
    k = {"n_min": 30, "blok_min": 5, "bootstrap": {"B": 300, "biji": 7}}
    # 40 transek di 8 blok; 2018,2019 lalu ramalan 2020. Laju -5/th; teramati 2020 = -5 (model tepat), persistensi 2019-2018 = +20 (meleset)
    T = [tr(i, f"d{i % 8}", -5, [[2018, 0], [2019, 20], [2020, 15]]) for i in range(40)]
    b = gabung([], bekukan([{**t, "jarak": t["jarak"][:2]} for t in T], "2026-01-01"))
    assert len(b) == 40 and b[0]["pred_delta"] == -5 and b[0]["persist_delta"] == 20 and b[0]["ramalan_tahun"] == 2020
    assert skor(b, [{**t, "jarak": t["jarak"][:2]} for t in T], k)["n"] == 0   # tahun ramalan belum ada: belum diuji, bukan nol
    h = skor(b, T, k)
    assert h["vonis"] == "lolos" and h["mae_model"] == 0 and h["mae_pers"] == 25 and h["selang95"][0] > 0, h
    # persistensi menang: teramati = persistensi (+20) -> model (-5) kalah di tiap baris
    T2 = [tr(i, f"d{i % 8}", -5, [[2018, 0], [2019, 20], [2020, 40]]) for i in range(40)]
    h2 = skor(gabung([], bekukan([{**t, "jarak": t["jarak"][:2]} for t in T2], "x")), T2, k)
    assert h2["vonis"] == "gagal" and h2["selisih"] == -25 and h2["selang95"][1] < 0, h2
    # tanpa perubahan menang: teramati 0 -> model (-5) kalah dari delta 0 (E=5 vs 0) walau persistensi (+20) lebih buruk
    T3 = [tr(i, f"d{i % 8}", -5, [[2018, 0], [2019, 20], [2020, 20]]) for i in range(40)]
    h3 = skor(gabung([], bekukan([{**t, "jarak": t["jarak"][:2]} for t in T3], "x")), T3, k)
    assert h3["vonis"] == "gagal" and h3["selisih"] > 0 and h3["selisih_nol"] == -5 and h3["selang95_nol"][1] < 0, h3
    assert entri_gerbang(h3)["boleh_tampil"] is False and entri_gerbang(h3)["pembanding"].startswith("tanpa perubahan")
    # terlalu sedikit baris/blok: belum_cukup_data, bukan lolos
    assert skor(b[:10], T, k)["vonis"] == "belum_cukup_data"
    # transek bertanda tinjau di tahun ramalan dan GANGGUAN tak dinilai / tak dibekukan
    Tt = [{**t, "tinjau": [2020]} for t in T]
    assert skor(b, Tt, k)["n"] == 0 and skor(b, Tt, k)["dilewati_tinjau"] == 40
    assert bekukan([{**T[0], "gangguan": ("x", 2019)}], "x") == [] and bekukan([{**T[0], "laju": None}], "x") == []
    assert bekukan([tr(1, "d", -1, [[2018, 0], [2020, 5]])], "x") == []   # tanpa tahun Y-1: tak ada persistensi
    # append-only: gabung idempoten, baris lama tak berubah, menyusut/diubah ditolak
    assert gabung(b, b) == b
    jaga(b, gabung(b, bekukan([tr(99, "d0", -1, [[2018, 0], [2019, 1]])], "y")))   # tambah di ujung boleh
    for calon in (b[:-1], [{**b[0], "pred_delta": 9}] + b[1:], [b[1], b[0]] + b[2:]):
        try:
            jaga(b, calon)
        except RuntimeError:
            pass
        else:
            raise AssertionError("arsip menyusut/berubah tetapi lolos")
    # gerbang: lolos prospektif membuka, gagal dan kosong menutup
    assert entri_gerbang(h)["boleh_tampil"] is True and entri_gerbang(h2)["boleh_tampil"] is False
    assert entri_gerbang({"n": 0})["boleh_tampil"] is False
    print("abrasi_prospektif uji: lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["kunci"]:
        kunci()
    elif a == ["jalan"]:
        print(json.dumps(jalan(), indent=1))
    else:
        sys.exit("pakai: abrasi_prospektif.py uji|kunci|jalan")
