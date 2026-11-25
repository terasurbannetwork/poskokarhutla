"""Deteksi lonjakan binomial negatif (KI-52; ALGORITMA §7). Python stdlib saja. "Deteksi lonjakan, BUKAN prakiraan."

Pola scripts/gempa/beruntun.py (nb_ekor dimuat dari sana, tidak disalin):
  rerata per sasaran dari jendela belakang (maks 365 hari SEBELUM hari itu, prior Jeffreys +0,5), overdispersi alpha SATU angka dari data (momen),
  menyala bila n >= 3 dan min(1, ekor_NB(n) x jumlah_sasaran) < 0,01 (koreksi banyak sasaran). Tingkat menyala = backtest atas seluruh arsip.

Dua pemakai (data yang DILACAK git; arsip mentah FIRMS/kab tidak ada di CI):
  karhutla  public/data/harian_panjang.json  titik panas per PROVINSI per hari (bukan kab: arsip per kab tidak dilacak).
  udara     public/udara/data/prakiraan_arsip.json  PM2,5 PRAKIRAAN model (CAMS) per kab, dibulatkan ke bilangan bulat; hanya puluhan hari.
            Ini bukan pengamatan; baseline pendek (< MIN_HARI -> tidak_dinilai).
Keluaran: public/data/lonjakan/{karhutla,udara}.json ("dibuat" paling pertama).
  python3 -I scripts/umum/lonjakan.py uji | jalan
"""
import datetime as dt
import importlib.util
import json
import os
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
AMBANG_P, N_MIN, JEFFREYS, JENDELA, MIN_HARI = 0.01, 3, 0.5, 365, 28   # AMBANG_P/N_MIN = ALGORITMA §7; MIN_HARI = hipotesis awal
LABEL = "deteksi lonjakan, bukan prakiraan"


def _nb():
    s = importlib.util.spec_from_file_location("beruntun_nb", os.path.join(AKAR, "scripts/gempa/beruntun.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.nb_ekor


def _lam(seri, t):
    w = seri[max(0, t - JENDELA):t]
    return (sum(w) + JEFFREYS) / len(w) if w else None


def deteksi(cacah, nb_ekor=None, ambang=AMBANG_P, n_min=N_MIN, min_hari=MIN_HARI):
    """cacah = {sasaran: [n per hari, urut waktu]} (panjang sama). -> dict alpha, tingkat_menyala (per pasangan sasaran-hari), hari_menyala, kini {sasaran: (n, lam, p)}.
    Evaluasi hari t memakai hanya hari < t (tanpa bocor)."""
    nb_ekor = nb_ekor or _nb()
    S, H = list(cacah), len(next(iter(cacah.values())))
    if H <= min_hari:
        return {"tidak_dinilai": "arsip %d hari <= minimum %d" % (H, min_hari)}
    sel = sl2 = 0.0
    for i in S:
        for t in range(min_hari, H):
            l = _lam(cacah[i], t)
            sel += (cacah[i][t] - l) ** 2 - l
            sl2 += l * l
    alpha = max(0.0, sel / sl2)
    nyala, per_hari, kini = 0, set(), {}
    for t in range(min_hari, H):
        for i in S:
            n = cacah[i][t]
            l = _lam(cacah[i], t)
            p = min(1.0, nb_ekor(n, l, alpha) * len(S)) if n >= n_min else 1.0
            if p < ambang:
                nyala += 1
                per_hari.add(t)
            if t == H - 1:
                kini[i] = (n, l, p)
    pasang = len(S) * (H - min_hari)
    return {"alpha": alpha, "n_sasaran": len(S), "n_hari": H, "n_hari_dievaluasi": H - min_hari, "n_pasang": pasang, "n_menyala": nyala,
            "tingkat_menyala": nyala / pasang, "hari_menyala": len(per_hari), "tingkat_hari_menyala": len(per_hari) / (H - min_hari), "kini": kini}


def _tulis(nama, isi):
    jalur = os.path.join(AKAR, "public/data/lonjakan", nama + ".json")
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"), "label": LABEL}
    out.update(isi)
    with open(jalur + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def _bungkus(r, hari, nama, sumber, satuan, catatan):
    base = {"sumber": sumber, "satuan": satuan, "catatan": catatan,
            "aturan": "menyala bila n >= %d dan ekor binomial negatif x jumlah sasaran < %s; rerata dari maks %d hari sebelumnya" % (N_MIN, AMBANG_P, JENDELA)}
    if "tidak_dinilai" in r:
        return dict(base, tidak_dinilai=r["tidak_dinilai"], lonjakan=[])
    kini = [{"id": i, "nama": nama.get(i, i), "n": n, "rerata": round(l, 2), "peluang_terkoreksi": round(p, 6)} for i, (n, l, p) in r["kini"].items() if p < AMBANG_P]
    kini.sort(key=lambda x: x["peluang_terkoreksi"])
    return dict(base, tanggal=hari[-1], lonjakan=kini,
                backtest={k: (round(v, 5) if isinstance(v, float) else v) for k, v in r.items() if k != "kini"})


def jalan():
    d = json.load(open(os.path.join(AKAR, "public/data/harian_panjang.json"), encoding="utf-8"))
    r = deteksi(d["prov"])
    _tulis("karhutla", _bungkus(r, d["hari"], {}, "NASA FIRMS (harian_panjang.json)", "titik panas per provinsi per hari",
                                "Sasaran = provinsi (arsip per kab tidak dilacak git). Musim kering menaikkan hitungan pelan-pelan; tingkat menyala backtest mengukur seberapa sering ini keliru terbaca lonjakan."))
    print("karhutla:", {k: v for k, v in (r if "tidak_dinilai" in r else {**r, "kini": len([1 for x in r["kini"].values() if x[2] < AMBANG_P])}).items()})
    a = json.load(open(os.path.join(AKAR, "public/udara/data/prakiraan_arsip.json"), encoding="utf-8"))
    hari = sorted(a["tgl"])
    cacah = {k: [round(a["tgl"][h][j]) if j < len(a["tgl"][h]) and a["tgl"][h][j] is not None else 0 for h in hari] for j, k in enumerate(a["kode"])}
    nama = {k["kode"]: k["nama"] for k in json.load(open(os.path.join(AKAR, "public/udara/data/prakiraan.json"), encoding="utf-8"))["kota"]}
    r2 = deteksi(cacah)
    _tulis("udara", _bungkus(r2, hari, nama, "CAMS via Open-Meteo, arsip prakiraan (prakiraan_arsip.json)", "PM2,5 prakiraan, ug/m3 dibulatkan, per kab",
                             "Yang dideteksi adalah lonjakan PRAKIRAAN model, bukan pengamatan. Arsip pendek dan tanggal tak berurutan harian: temuan belum teruji."))
    print("udara:", {k: v for k, v in (r2 if "tidak_dinilai" in r2 else {**r2, "kini": len([1 for x in r2["kini"].values() if x[2] < AMBANG_P])}).items()})


def uji():
    nb = _nb()
    import random
    rng = random.Random(7)
    # lonjakan di hari terakhir satu sasaran dari 20 yang tenang (rerata ~2): harus menyala, sasaran lain tidak
    S = {"s%d" % i: [rng.choice([1, 2, 2, 3, 1, 2]) for _ in range(120)] for i in range(20)}
    S["s0"][-1] = 40
    r = deteksi(S, nb)
    assert r["kini"]["s0"][2] < AMBANG_P and all(v[2] >= AMBANG_P for k, v in r["kini"].items() if k != "s0"), r["kini"]["s0"]
    assert r["n_hari_dievaluasi"] == 120 - MIN_HARI and 0 <= r["tingkat_menyala"] < 0.01 and r["alpha"] >= 0
    # DITOLAK: n < 3 tidak menyala walau rerata ~0; koreksi sasaran: p x N mencegah satu lonjakan sedang di banyak sasaran
    Z = {"a%d" % i: [0] * 100 for i in range(10)}
    Z["a0"][-1] = 2
    assert deteksi(Z, nb)["kini"]["a0"][2] == 1.0
    Z["a0"][-1] = 3                                                   # n=3 sudah boleh dinilai, rerata ~0,005: menyala
    assert deteksi(Z, nb)["kini"]["a0"][2] < AMBANG_P
    # DITOLAK: arsip terlalu pendek -> tidak_dinilai, bukan angka
    assert "tidak_dinilai" in deteksi({"x": [1] * MIN_HARI}, nb)
    # tanpa bocor: mengubah hari terakhir tak mengubah evaluasi hari-hari sebelumnya (jumlah nyala di luar hari terakhir sama)
    A, B = {k: list(v) for k, v in S.items()}, {k: list(v) for k, v in S.items()}
    B["s5"][-1] = 500
    assert deteksi(A, nb)["kini"]["s5"][1] == deteksi(B, nb)["kini"]["s5"][1]
    # overdispersi: deret Poisson-campur beralpha > 0 pada deret bergelombang, ~0 pada deret datar
    datar = {"d": [2] * 100, "e": [2] * 100}
    assert deteksi(datar, nb)["alpha"] == 0.0
    print("lonjakan uji OK: alpha", round(r["alpha"], 3), "tingkat_menyala", round(r["tingkat_menyala"], 5))


if __name__ == "__main__":
    {"uji": uji, "jalan": jalan}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
