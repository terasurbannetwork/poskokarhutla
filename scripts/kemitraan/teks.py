#!/usr/bin/env python3
"""Teks murni Kemitraan Kampus: token, stem ringan, pecah kalimat, solusi ekstraktif (ALG §4.2, §5; KM-C07).
Tanpa jaringan, tanpa LLM. Kasus acuan: tests/kemitraan/fixtures/acuan.json `solusi` (A8-A8c).
Pakai: python3 -I scripts/kemitraan/teks.py --cek"""
import json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402

SO = KONST["SOLUSI"]
RE_KATA = re.compile(r"[^\W_]+")
RE_BATAS = re.compile(r"[.!?](?=\s+[A-Z])")  # akhir kalimat + spasi + huruf besar
SUFIKS = r"(?:s|es|d|ed|ing|ling|nya|kan|an)?"  # penanda dicocokkan sebagai KATA (+ imbuhan umum), bukan substring: system != ecosystem, method != methodology
SINGKATAN = {"al.", "e.g.", "i.e.", "dkk.", "dll.", "dsb.", "dst.", "vs.", "dr.", "prof.", "no.", "fig.", "etc.", "cf.", "approx.", "ca.", "yg."}
_KAMUS = None
_RX_PENANDA = None


def kamus():
    global _KAMUS
    if _KAMUS is None:
        _KAMUS = json.load(open(os.path.join(AKAR, "scripts", "kemitraan", "kamus.json"), encoding="utf-8"))
        _KAMUS["_henti"] = set(_KAMUS["henti"])
        _KAMUS["_stem"] = sorted(_KAMUS["stem"], key=len, reverse=True)  # akhiran terpanjang dulu
    return _KAMUS


def stem(t, akhiran=None):
    """Buang SATU akhiran (tabel kamus.json:stem, terpanjang dulu) bila sisanya >= 3 huruf."""
    for a in akhiran or kamus()["_stem"]:
        if t.endswith(a) and len(t) - len(a) >= 3:
            return t[:-len(a)]
    return t


def token(teks):
    """Huruf kecil, buang tanda baca, buang kata henti ID+EN, stem ringan (ALG §4.2)."""
    k = kamus()
    return [stem(w) for w in RE_KATA.findall(str(teks or "").lower()) if len(w) > 1 and w not in k["_henti"]]


def kalimat(abstrak):
    """Pecah di titik/tanda tanya/seru + spasi + huruf besar; singkatan (et al., e.g., dkk., inisial) dan desimal tidak memecah."""
    s = str(abstrak or "").strip()
    out, mulai = [], 0
    for m in RE_BATAS.finditer(s):
        kata = s[mulai:m.end()].rsplit(None, 1)[-1].lstrip("(\"'[")
        if m.group() == "." and (kata.lower() in SINGKATAN or re.fullmatch(r"[A-Z]\.", kata)):
            continue
        out.append(s[mulai:m.end()].strip())
        mulai = m.end()
    if s[mulai:].strip():
        out.append(s[mulai:].strip())
    return out


def penanda(kecil):
    """Jumlah penanda solusi (kamus.json:solusi) yang muncul di kalimat huruf kecil, sekali per penanda. Cocok di awal kata dan, kecuali stem 'mitigat',
    di akhir kata (imbuhan umum boleh): 'ecosystem', 'ekosistem', 'methodology' tidak dihitung; 'systems', 'modelling' dihitung."""
    global _RX_PENANDA
    if _RX_PENANDA is None:
        _RX_PENANDA = [re.compile(r"(?<![^\W_])" + re.escape(x).replace(r"\ ", r"\s+") + (r"\w*" if x == "mitigat" else SUFIKS) + r"(?![^\W_])") for x in kamus()["solusi"]]
    return sum(1 for rx in _RX_PENANDA if rx.search(kecil))


def skor_kalimat(daftar, q, i, wilayah=()):
    """2 x penanda solusi + token Q berbeda yang ada di kalimat - 0,5 bila kalimat ke-1 tanpa penanda.
    Token nama wilayah (provinsi, pulau, kab) tidak dihitung sebagai token Q: kalimat yang hanya menyebut tempat tidak lolos ambang."""
    p = penanda(daftar[i].lower())
    t = len((set(q) - set(wilayah)) & set(token(daftar[i])))
    return SO["BOBOT_PENANDA"] * p + t - (SO["PENALTI_LATAR"] if i == 0 and p == 0 else 0)


def solusi(daftar, q, wilayah=()):
    """1-2 kalimat berskor tertinggi (>= SKOR_MIN), urut skor turun lalu urutan asli. Kutipan apa adanya."""
    sk = [(skor_kalimat(daftar, q, i, wilayah), i) for i in range(len(daftar))]
    sk = sorted((x for x in sk if x[0] >= SO["SKOR_MIN"]), key=lambda x: (-x[0], x[1]))[:SO["MAKS_KALIMAT"]]
    return [{"kalimat": daftar[i], "skor": s} for s, i in sk]


def cek():
    ac = json.load(open(os.path.join(AKAR, "tests", "kemitraan", "fixtures", "acuan.json"), encoding="utf-8"))["solusi"]
    n = 0
    for c in ac:
        h = kalimat(c["masuk"]["abstrak"]) if c["fungsi"] == "kalimat" else solusi(c["masuk"]["kalimat"], c["masuk"]["q"])
        assert h == c["keluar"], f"solusi {c['id']}: {h} != {c['keluar']}"
        n += 1
    # token: henti dibuang, stem ringan, deterministik
    assert token("Banjir-nya besar, and the flooding of rivers.") == ["banjir", "besar", "flood", "river"], token("Banjir-nya besar, and the flooding of rivers.")
    assert stem("floods") == "flood" and stem("warning") == "warn" and stem("ban") == "ban" and stem("an") == "an"
    assert token("") == [] and token(None) == []
    # desimal dan inisial tidak memecah; tanpa huruf besar di depan tidak memecah
    assert kalimat("Found by J. Smith in 3.5 m. depth. Done.") == ["Found by J. Smith in 3.5 m. depth.", "Done."], kalimat("Found by J. Smith in 3.5 m. depth. Done.")
    assert kalimat("") == [] and solusi([], ["a"]) == []
    # penanda = kata, bukan substring
    assert penanda("the ecosystem and methodology") == 0 and penanda("ekosistem pesisir") == 0
    assert penanda("two systems and a modelling method") == 3 and penanda("mitigation of floods") == 1 and penanda("sistem peringatan dini") == 1
    # nama wilayah tidak menaikkan skor: 3 kata wilayah tanpa penanda tetap di bawah ambang
    W = token("Kalimantan Tengah Pulang Pisau")
    kal = ["The program covered Kalimantan Tengah Pulang Pisau.", "We propose an early warning system."]
    assert solusi(kal, W, W) == [{"kalimat": kal[1], "skor": 6}]
    assert len(solusi(kal, W)) == 2  # tanpa pengecualian wilayah, kalimat tempat lolos (3,5)
    print(f"OK teks.py: {n} kasus acuan solusi (A8-A8c), token/stem, pecah kalimat")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        sys.exit(__doc__)
