"""Model kekeringan BAYANGAN (uji berdampingan) -> public/kekeringan/data/peluang_bayangan.json, _arsip.json, _nilai.json.

Berjalan SAMPING aturan lama (SPI-3 <= -1 -> status), tidak menggantinya. Pemenang lab (2 Nov 2026, VERIFIKASI.md): pola kejadian kabupaten x bulan
+ SPI-3, tenggang 1 bulan. Tenggang 3 bulan: klimatologi kabupaten-bulan saja. ONI dan DMI dibuang (kebocoran jeda rilis).
  uji (2023-01..2026-02, 19.526 kab-bulan, dasar 2,4%): AUC-PR 0,175 vs klimatologi 0,134 vs aturan lama SPI-3 0,034 (acak 0,024); skill Brier +1,7%.
  FAR tetap sekitar 88% pada laju alarm 11%, sama dengan klimatologi: ini peringkat kabupaten-bulan, bukan peringatan.
logit = intersep + k0*z(logit klimatologi kab-bulan) + k1*z(SPI-3), z memakai rerata/sd LATIH 2008-2019 (scripts/kekeringan/klim_bayangan.json).

Beda dari lab (dicatat, belum diukur): SPI-3 operasional = kekeringan_wilayah.json (NASA POWER MERRA-2 kisi 0,5 derajat, gamma dasar 1991-2020,
rerata sel berbobot penduduk), lab = CHIRPS per kabupaten, gamma 2008-2019. Skala sama (normal baku) tapi bukan angka yang sama; skill bisa meleset.
Label lab = laporan DIBI/LB; label penilaian prospektif = laporan Pusdalops (data/raw/kekeringan_label.json, sk+rekap+laphar+logbook), sumber berbeda.

Penilaian prospektif: tiap bulan_data satu entri ke arsip (APPEND-ONLY, entri yang sudah ada tidak pernah ditimpa). Dinilai terhadap laporan kekeringan
kab-bulan (hanya bulan dalam cakupan sumber label; bulan tanpa cakupan tidak dihitung negatif) lawan klimatologi dan aturan lama (-SPI-3).
Kurang dari MIN_POS positif = "belum cukup", angka tetap ditulis apa adanya.

Pakai:  python3 scripts/kekeringan/bayangan.py        |  python3 scripts/kekeringan/bayangan.py uji
"""
import datetime as dt
import math
import os
import sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan

AKAR = os.path.abspath(os.path.join(AB, "..", ".."))
PARAM = os.path.join(AB, "klim_bayangan.json")
WILAYAH = os.path.join(AKAR, "public/data/kekeringan_wilayah.json")
META = os.path.join(AKAR, "public/data/kekeringan_meta.json")
LABEL = os.path.join(AKAR, "data/raw/kekeringan_label.json")
KELUAR = os.path.join(AKAR, "public/kekeringan/data/peluang_bayangan.json")
ARSIP = os.path.join(AKAR, "public/kekeringan/data/peluang_bayangan_arsip.json")
NILAI = os.path.join(AKAR, "public/kekeringan/data/peluang_bayangan_nilai.json")
MIN_POS = 30


def geser(ym, n):
    y, m = int(ym[:4]), int(ym[5:7])
    t = y * 12 + m - 1 + n
    return f"{t // 12}-{t % 12 + 1:02d}"


def logit(p):
    return math.log(p / (1 - p))


def peluang(P, kl, spi3):
    """P(kab-bulan ada laporan kekeringan) tenggang 1; kl = klimatologi bulan target (0..1)."""
    z0 = (logit(kl) - P["mu"][0]) / P["sd"][0]
    z1 = (max(-3.09, min(3.09, spi3)) - P["mu"][1]) / P["sd"][1]  # lab: SPI terpangkas di +-3,09 (peluang 1e-3); POWER bisa melewati itu, jangan ekstrapolasi
    return 1 / (1 + math.exp(-(P["intersep"] + P["koef"][0] * z0 + P["koef"][1] * z1)))


def ap(skor, y):
    """Average precision (sama dengan sklearn average_precision_score; seri dikelompokkan)."""
    n = sum(y)
    if not n:
        return None
    o = sorted(zip(skor, y), key=lambda t: -t[0])
    tp = fp = 0
    prev_r = 0.0
    hasil = 0.0
    i = 0
    while i < len(o):
        j = i
        while j < len(o) and o[j][0] == o[i][0]:
            tp += o[j][1]
            fp += 1 - o[j][1]
            j += 1
        r = tp / n
        hasil += (r - prev_r) * tp / (tp + fp)
        prev_r = r
        i = j
    return hasil


def bangun():
    P = baca(PARAM)
    W, M = baca(WILAYAH), baca(META)
    bulan = M["spi"]["bulan"]
    b1, b3 = geser(bulan, 1), geser(bulan, 3)
    baris, hilang = {}, 0
    for k, v in W["kab"].items():
        kl = P["kab"].get(k)
        if kl is None or v.get("spi3") is None:
            hilang += 1  # kabupaten tanpa riwayat lab (mis. pemekaran baru) atau tanpa SPI dibuang, tidak diisi
            continue
        baris[k] = [v["spi3"], round(peluang(P, kl[int(b1[5:]) - 1], v["spi3"]), 5), kl[int(b1[5:]) - 1], kl[int(b3[5:]) - 1]]
    isi = {"versi": 1, "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "label": "Uji berdampingan, bukan pengganti aturan lama", "bulan_data": bulan, "bulan_t1": b1, "bulan_t3": b3,
           "kolom": ["spi3", "p_model_t1", "p_klim_t1", "p_klim_t3"],
           "model": {"rumus": "klimatologi kabupaten-bulan + SPI-3, tenggang 1 bulan; tenggang 3 bulan klimatologi saja; ONI dan DMI dibuang",
                     "latih": P["latih"], "aucpr_uji_t1": round(P["aucpr_uji_T1"], 3), "aucpr_uji_klim": round(P["aucpr_uji_klim"], 3), "aucpr_uji_aturan_lama": 0.034,
                     "far_uji": 0.88, "alarm_uji": 0.11, "dasar_uji": round(P["uji_pos"] / P["uji_n"], 3), "brier_skill_uji": round(P["brier_skill_uji"], 3),
                     "uji": "2023-01 sampai 2026-02, satu tahun El Nino; FAR sekitar 88% pada laju alarm 11%, sama dengan klimatologi",
                     "catatan": "SPI-3 di sini dari NASA POWER (kisi 0,5 derajat), lab memakai CHIRPS; skala sama, angka tidak persis sama."},
           "kab": baris, "dibuang": hilang}
    simpan(KELUAR, isi)
    arsip = baca(ARSIP, {"versi": 1, "aturan": "append-only: kunci bulan_data yang sudah ada tidak ditimpa", "entri": {}})
    if bulan not in arsip["entri"]:
        arsip["entri"][bulan] = {"terbit": isi["dibuat"], "bulan_t1": b1, "kab": {k: [r[0], r[1], r[2]] for k, r in baris.items()}}
        simpan(ARSIP, arsip)
    print(f"bayangan: {len(baris)} kab, bulan data {bulan}, T1 {b1}, dibuang {hilang}; arsip {len(arsip['entri'])} bulan")
    nilai_tulis()


def label_kab_bulan():
    """({(kab, ym)} positif, {ym} bulan yang boleh dinilai) dari label Pusdalops; None bila berkas tak ada (mis. CI)."""
    L = baca(LABEL)
    if not L:
        return None
    pos, cakup = set(), set()
    for s in L["sumber"].values():
        cakup.update(s["bulan_cakupan"])
        for k, bl in s["kab_bulan_data"].items():
            pos.update((k, b) for b in bl)
    return pos, cakup


def _hitung(arsip, pos, cakup, murni):
    skor = {"model": [], "klim": [], "lama": []}
    y, bln = [], []
    for ym, e in sorted(arsip["entri"].items()):
        t = e["bulan_t1"]
        if t not in cakup or (e["terbit"][:7] <= geser(t, -1)) != murni:
            continue
        bln.append(t)
        for k, (s3, p, kl) in e["kab"].items():
            y.append(int((k, t) in pos))
            skor["model"].append(p)
            skor["klim"].append(kl)
            skor["lama"].append(-s3)
    n, np_ = len(y), sum(y)
    r = {"bulan_dinilai": bln, "n": n, "positif": np_, "dasar": round(np_ / n, 4) if n else None,
         "cukup": murni and np_ >= MIN_POS, "aucpr": {k: (None if ap(v, y) is None else round(ap(v, y), 4)) for k, v in skor.items()}}
    if n and np_:
        bs = lambda p: sum((a - b) ** 2 for a, b in zip(p, y)) / n
        r["skill_brier_vs_klim"] = round(1 - bs(skor["model"]) / bs(skor["klim"]), 4)
    return r


def nilai(arsip, pos, cakup):
    """Prospektif = terbit paling lambat sebelum bulan target (terbit[:7] <= target-1); sisanya retrospektif, dilaporkan terpisah dan tak pernah 'cukup'."""
    r = _hitung(arsip, pos, cakup, True)
    r["retrospektif"] = _hitung(arsip, pos, cakup, False)
    return r


def nilai_tulis():
    arsip = baca(ARSIP)
    lab = label_kab_bulan()
    if lab is None or not arsip:
        print("nilai: label Pusdalops tidak ada di mesin ini, penilaian dilewati (berkas lama dibiarkan)")
        return
    r = nilai(arsip, *lab)
    r.update({"dibuat": dt.date.today().isoformat(), "label": "laporan kekeringan kab-bulan Pusdalops (sk, rekap, laphar, logbook), bukan label lab",
              "catatan": f"Blok utama hanya memuat prakiraan yang terbit sebelum bulan targetnya mulai. Data SPI NASA POWER terlambat sekitar 2 bulan, jadi bulan target sering sudah berjalan saat terbit; entri itu ada di blok retrospektif dan tidak dihitung sebagai bukti prospektif. Kurang dari {MIN_POS} positif = belum cukup untuk menyimpulkan."})
    simpan(NILAI, r)
    print(f"nilai prospektif: {r['n']} kab-bulan, {r['positif']} positif; retrospektif: {r['retrospektif']['n']} kab-bulan, {r['retrospektif']['positif']} positif")


def uji():
    P = baca(PARAM)
    # 3 baris contoh dari lab (jalan_kering.py, tenggang 1) harus cocok sampai 1e-6 relatif
    for c in P["contoh_lab"]:
        p = peluang(P, 1 / (1 + math.exp(-c["klim_logit"])), c["spi3"])
        assert abs(p - c["p"]) <= 1e-6 * c["p"], (c, p)
    assert peluang(P, .05, -9) == peluang(P, .05, -3.09)
    # SPI kering menaikkan peluang, klimatologi lebih tinggi menaikkan peluang
    assert peluang(P, .05, -2) > peluang(P, .05, 0) > peluang(P, .05, 2)
    assert peluang(P, .1, 0) > peluang(P, .01, 0)
    assert geser("2026-11", 3) == "2027-02" and geser("2026-01", -1) == "2025-12"
    # AP: sempurna = 1; seri semua sama = dasar; contoh tangan
    assert ap([3, 2, 1], [1, 0, 0]) == 1.0
    assert abs(ap([1, 1, 1, 1], [1, 0, 0, 0]) - .25) < 1e-12
    assert abs(ap([4, 3, 2, 1], [0, 1, 0, 1]) - (1 / 2 * .5 + .5 * 2 / 4)) < 1e-12
    # tabel: 12 bulan per kab, probabilitas valid
    assert all(len(v) == 12 and all(0 < x < 1 for x in v) for v in P["kab"].values())
    # arsip append-only + penilaian pada data kecil: kab A positif di Nov, B tidak
    kab = {"11|A": [-2.0, .4, .1], "11|B": [1.0, .01, .1]}
    arsip = {"entri": {"2026-10": {"terbit": "2026-10-19", "bulan_t1": "2026-11", "kab": kab}}}
    r = nilai(arsip, {("11|A", "2026-11")}, {"2026-11"})
    assert r["n"] == 2 and r["positif"] == 1 and r["aucpr"]["model"] == 1.0 and r["aucpr"]["klim"] == .5 and r["aucpr"]["lama"] == 1.0 and not r["cukup"]
    assert r["retrospektif"]["n"] == 0
    assert nilai(arsip, set(), {"2026-12"})["n"] == 0  # bulan di luar cakupan label tidak dinilai
    # terbit di dalam bulan target = retrospektif: tak masuk blok utama dan tak pernah cukup
    arsip["entri"]["2026-10"]["terbit"] = "2026-11-05"
    r = nilai(arsip, {("11|A", "2026-11")}, {"2026-11"})
    assert r["n"] == 0 and r["positif"] == 0 and r["retrospektif"]["n"] == 2 and not r["retrospektif"]["cukup"]
    print("bayangan uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else bangun()
