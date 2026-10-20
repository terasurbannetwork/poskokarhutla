"""Pola musim cuaca ekstrem -> public/banjir/data/cuaca_musim.json (kartu Kalender musim dan ENSO di Tren cuaca).

Hanya menghitung ulang yang sudah tercatat, tanpa angka karangan:
  bulan  : kejadian DIBI BNPB jenis cuaca dan gelombang per bulan, HANYA tahun kalender TAHUN_BULAN (satu-satunya tahun penuh Jan-Des di `kejadian_dibi`; 2023 mulai 14 Okt, 2024 tidak lengkap, 2026 telat lapor)
  tahun  : kejadian cuaca + gelombang per tahun (kejadian.json `nasional`, 2010 sampai TAHUN_MAKS) dengan fase ENSO tahun itu
  enso   : fase = rata-rata ONI seluruh musim 3-bulanan pada tahun itu (public/data/iklim.json `oni`, NOAA CPC): >= +0,5 El Niño, <= -0,5 La Niña, selain itu Netral.
Tahun DIBI yang belum lengkap (catatan kejadian.json: 2024) dibuang. Tanpa kejadian.json atau iklim.json: tidak menulis apa pun.

  python3 scripts/cuaca/musim.py        # tulis berkas
  python3 scripts/cuaca/musim.py uji    # self-check tanpa jaringan
"""
import os, sys

from dasar import AKAR, KELUAR, baca, simpan

TAHUN_BULAN = 2025    # kalender bulanan hanya dari tahun ini; tahun lain separuh kosong karena pelaporan DIBI
TAHUN_MAKS = 2023     # DIBI 2024 tidak lengkap (kejadian.json `catatan`)
JENIS = ("cuaca", "gelombang")
AMBANG_ONI = 0.5


def fase(oni):
    return "El Niño" if oni >= AMBANG_ONI else "La Niña" if oni <= -AMBANG_ONI else "Netral"


def oni_tahunan(oni):
    """{tahun: rata-rata ONI} hanya untuk tahun yang punya 12 musim 3-bulanan."""
    per = {}
    for o in oni or []:
        per.setdefault(o["tahun"], []).append(o["nilai"])
    return {t: round(sum(v) / 12, 2) for t, v in per.items() if len(v) == 12}


def susun(kej, ik):
    dibi = [x for x in kej.get("kejadian_dibi", []) if x.get("jenis") in JENIS and len(x.get("tanggal", "")) == 10 and x["tanggal"][:4] == str(TAHUN_BULAN)]
    nas, rata = kej.get("nasional", {}), oni_tahunan(ik.get("oni"))
    bulan = {j: [0] * 12 for j in JENIS}
    for x in dibi:
        bulan[x["jenis"]][int(x["tanggal"][5:7]) - 1] += 1
    tahun = {}
    for t in sorted({int(y) for j in JENIS for y in nas.get(j, {})}):
        if t > TAHUN_MAKS or t not in rata:
            continue
        n = sum((nas.get(j, {}).get(str(t)) or {}).get("kejadian", 0) for j in JENIS)
        if n:
            tahun[str(t)] = {"n": n, "oni": rata[t], "fase": fase(rata[t])}
    if not dibi or len(tahun) < 5:
        return None
    return {"tahun_bulan": TAHUN_BULAN, "bulan": bulan, "tahun": tahun, "tahun_maks": TAHUN_MAKS,
            "kini": {k: ik.get(k) for k in ("status", "iod_status") if ik.get(k)} | ({"oni": ik["oni_terakhir"]} if ik.get("oni_terakhir") else {}),
            "sumber": "BNPB DIBI (dibi.bnpb.go.id) jenis cuaca ekstrem dan gelombang ekstrem; ONI NOAA CPC"}


def main():
    kej, ik = baca(os.path.join(KELUAR, "kejadian.json")), baca(os.path.join(AKAR, "public/data/iklim.json"))
    o = susun(kej, ik) if kej and ik else None
    if o:
        simpan(os.path.join(KELUAR, "cuaca_musim.json"), o)
        print(f"musim: {sum(map(sum, o['bulan'].values()))} kejadian bulanan, {len(o['tahun'])} tahun")
    return o


def uji():
    assert [fase(v) for v in (0.5, 0.49, -0.5, -0.4, 2.1)] == ["El Niño", "Netral", "La Niña", "Netral", "El Niño"]
    ms = lambda t, v: [{"tahun": t, "musim": str(i), "nilai": v} for i in range(12)]
    ik = {"oni": ms(2010, 1.0) + ms(2011, -1.0) + ms(2012, 0) + ms(2013, 0) + ms(2014, 0) + ms(2015, 0) + ms(2016, 0) + ms(2024, 2.0) + [{"tahun": 2017, "musim": "x", "nilai": 3}]}
    nas = {j: {str(t): {"kejadian": 10 + t - 2010} for t in range(2010, 2018)} | {"2024": {"kejadian": 99}} for j in JENIS}
    kej = {"nasional": nas, "kejadian_dibi": [{"tanggal": "2025-03-01", "jenis": "cuaca"}, {"tanggal": "2024-03-09", "jenis": "cuaca"}, {"tanggal": "2025-12-31", "jenis": "gelombang"},
                                              {"tanggal": "2025-05-01", "jenis": "banjir"}, {"tanggal": "rusak", "jenis": "cuaca"}]}
    o = susun(kej, ik)
    assert o["bulan"]["cuaca"][2] == 1 and o["bulan"]["gelombang"][11] == 1 and sum(map(sum, o["bulan"].values())) == 2, o["bulan"]
    assert sorted(o["tahun"]) == [str(t) for t in range(2010, 2017)], sorted(o["tahun"])   # 2017 ONI tak lengkap, 2024 melewati TAHUN_MAKS
    assert o["tahun"]["2010"] == {"n": 20, "oni": 1.0, "fase": "El Niño"} and o["tahun"]["2011"]["fase"] == "La Niña"
    assert o["tahun_bulan"] == 2025
    assert susun({"nasional": nas, "kejadian_dibi": []}, ik) is None and susun(kej, {"oni": []}) is None
    print("ok musim")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
