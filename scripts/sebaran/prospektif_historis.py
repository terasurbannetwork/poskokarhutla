"""UJI BALIK HISTORIS model "akan membesar" (BUKAN uji prospektif): ulangi protokol prospektif.py pada musim-musim lalu.

Memakai baris latih lolos_baris.pkl (fitur & label 72 jam dari lolos.baris: n72 >= LEPAS sel, sambungan <=750 m/<=24 jam, definisi yang sama
dengan prospektif.label72), konfigurasi (fitur, hiperparameter) yang sama dengan model terpasang (lolos.pilihan), ambang yang sama (recall >= 70%).

Disiplin waktu, per tahun uji Y (tidak ada tahun Y atau sesudahnya di bobot model, kalibrasi, maupun ambang):
  - model dilatih pada tahun <= Y-2
  - kalibrasi Platt + ambang WASPADA dari tahun Y-1 (satu-satunya data yang sudah "lalu" dan belum dipakai melatih)
  - dinilai pada tahun Y
Cuaca = reanalisis ERA5 (prakiraan sempurna) sedangkan prospektif memakai prakiraan Open-Meteo: angka di sini OPTIMISTIS bagi cuaca.
Catatan jujur lain (ditulis ke JSON): pemilihan fitur & hiperparameter dulu dilakukan dengan validasi silang 2015-2023, jadi 2019 dan 2023
sedikit terlihat lewat penyetelan itu; 2024-2026 sudah pernah dilihat sekali (model sel). Bobot model sendiri ketat luar-waktu.

Keluaran: public/data/prospektif_historis.json (bentuk metrik = mode.awal/ulang di prospektif.json, ditambah kunci per_tahun).
Berat (~12 pelatihan @ ~1 menit, memori ~3 GB). Pakai:  python3 scripts/sebaran/prospektif_historis.py  |  ... uji
"""
import datetime as dt, json, os, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import gbdt as G  # noqa: E402
import lolos as LL  # noqa: E402
import prospektif as P  # noqa: E402
from umum import PUBLIK  # noqa: E402

TAHUN_UJI = (2019, 2023, 2024, 2025, 2026)
# Baris latih sudah HANYA 9 provinsi prioritas (sama dengan prospektif.py). 2024-2026 = tahun yang tidak dipakai menyetel pilihan fitur/hiperparameter.
KELOMPOK = {"semua": TAHUN_UJI, "2024-2026": (2024, 2025, 2026)}
KELUAR = os.path.join(PUBLIK, "prospektif_historis.json")


def lipat(R, th, fitur, cfg):
    """(p, y, w, meta) untuk tahun uji th: luar-waktu ketat. Mengembalikan juga ambang & n latih/kalibrasi."""
    tr = [i for i, r in enumerate(R) if r[1] <= th - 2]
    ka = [i for i, r in enumerate(R) if r[1] == th - 1]
    te = [i for i, r in enumerate(R) if r[1] == th]
    m = LL.latih(tr, fitur, cfg)
    yk = [R[i][4] for i in ka]
    ab = LL.platt(LL.skor_mentah(m, ka), yk)
    sig = lambda idx: [G.sigmoid(ab[0] + ab[1] * z) for z in LL.skor_mentah(m, idx)]
    amb = LL.ambang_recall(sig(ka), yk)
    p = sig(te)
    return p, [R[i][4] for i in te], [1 if q >= amb else 0 for q in p], {"n_latih": len(tr), "n_kalibrasi": len(ka), "ambang": round(amb, 4)}


def main():
    t0 = time.time()
    R = LL.muat()
    fitur, cfg, fitur_u, cfg_u = LL.pilihan(json.load(open(LL.CV)))
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat()[:16], "jenis": "uji balik historis, bukan uji prospektif",
           "definisi": "lolos = >= 10 sel VIIRS 375 m (~140 ha) dalam 72 jam sejak deteksi pertama (sama dengan prospektif.json)",
           "protokol": "per tahun uji Y: model dilatih tahun <= Y-2, Platt dan ambang recall 70% dari tahun Y-1, dinilai tahun Y; tak ada tahun Y atau sesudahnya di bobot model",
           "catatan": ["cuaca reanalisis ERA5 (prakiraan sempurna), lebih baik dari prakiraan Open-Meteo yang dipakai prospektif: angka optimistis",
                       "fitur & hiperparameter dipilih dengan validasi silang 2015-2023, jadi 2019 dan 2023 sedikit terlihat lewat penyetelan; 2024-2026 sudah pernah dibuka sekali",
                       "model historis dilatih pada data lebih sedikit (2015-Y-2) daripada model terpasang, jadi tidak identik dengan model di layar",
                       "Brier skill memakai laju dasar himpunan yang dinilai sebagai klimatologi (generous ke klimatologi)"],
           "mode": {}}
    for mode, f_, c_ in (("awal", fitur, cfg), ("ulang", fitur_u, cfg_u)):
        hasil = {}
        for th in TAHUN_UJI:
            hasil[th] = lipat(R, th, f_, c_)
            print(mode, th, len(hasil[th][1]), "titik", hasil[th][3], round(time.time() - t0), "dtk", file=sys.stderr, flush=True)
        o = {}
        for nama, ths in KELOMPOK.items():
            p, y, w = ([v for th in ths for v in hasil[th][i]] for i in range(3))
            o[nama] = P.metrik_set(p, y, w)
            o[nama]["kalibrasi_ok"] = P.kalibrasi_lolos(o[nama]["kalibrasi"])
        o["per_tahun"] = {}
        for th in TAHUN_UJI:
            o["per_tahun"][str(th)] = {**P.metrik_set(*hasil[th][:3]), **hasil[th][3]}
        out["mode"][mode] = o
    out["ece_maks"], out["skill_min"] = P.ECE_MAKS, P.SKILL_MIN
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print("ditulis", KELUAR, round(time.time() - t0), "dtk", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        # lipat() tidak boleh melihat tahun uji atau sesudahnya: bobot (<= Y-2) dan kalibrasi (Y-1) terpisah dari uji (Y)
        R = [(str(i), 2015 + i % 8, "x", "mineral", i % 2, 0, 0, [float(i % 5)]) for i in range(400)]
        LL.D["R"], LL.D["kol"] = R, ["f"]
        ditemui = {}
        asli = LL.latih
        LL.latih = lambda idx, f, c: ditemui.setdefault("tr", {R[i][1] for i in idx}) and asli(idx, f, c)
        p, y, w, meta = lipat(R, 2019, ["f"], {"pohon": 3, "dalam": 2})
        assert ditemui["tr"] == {2015, 2016, 2017} and len(p) == len(y) == len(w) == 50 and meta["n_kalibrasi"] == 50, (ditemui, meta)
        print("ok")
    else:
        main()
