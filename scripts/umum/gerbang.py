"""Gerbang tampil inti (KI-12): "keluaran model hanya tampil bila menang lawan pembanding sederhana". Python stdlib saja, fungsi murni.

ATURAN (ALGORITMA.md §3, jangan dilonggarkan): boleh_tampil = selisih > 0 (positif = model lebih baik; arah "rendah" dibalik) DAN batas bawah
selang 95% selisih > 0. Tanpa selang = false, alasan "belum ada selang". Keluaran prospektif juga wajib vonis == "lolos".

Entri: {metrik, arah, pembanding, n, skor_model, skor_pembanding, selisih, selang95|null, vonis_prospektif, boleh_tampil, alasan, ...}.
Berkas: public/data/gerbang/<bencana>.json = {"dibuat", "versi", "keluaran": {nama: entri}}, < 100 KB. Pembaca gagal-tertutup (public/inti/gerbang.js).
Pemakai: scripts/sebaran/gerbang.py (karhutla, tulis juga gerbang_model.json lama), scripts/udara/gerbang_udara.py.

Pakai:  python3 -I scripts/umum/gerbang.py uji
"""
import math
import json
import os
import random
import sys
import time

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
BATAS_BYTE = 100_000
BOOT_B, BOOT_BIJI = 2000, 7


def r4(x):
    return None if x is None else round(x, 4)


def selang_berpasangan(selisih, b=BOOT_B, biji=BOOT_BIJI):
    """(rata-rata, bawah95, atas95) bootstrap persentil atas daftar selisih per kasus. None bila kosong."""
    s = [x for x in selisih if x is not None]
    if not s:
        return None
    rnd, m, v = random.Random(biji), len(s), []
    for _ in range(b):
        v.append(sum(s[rnd.randrange(m)] for _ in range(m)) / m)
    v.sort()
    return sum(s) / m, v[int(.025 * b)], v[int(.975 * b)]


def putusan(selisih, selang, vonis=None, prospektif=False):
    """(boleh_tampil, alasan). selang = (bawah, atas) | None. prospektif=True: wajib vonis == 'lolos'."""
    angka = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
    if selisih is not None and not angka(selisih) or selang is not None and not (len(selang) == 2 and all(angka(v) for v in selang)):
        ok, alasan = False, "angka tidak terhingga, NaN, atau bukan angka: gagal-tertutup"
    elif selisih is None or selisih <= 0:
        ok, alasan = False, f"selisih {selisih if selisih is None else round(selisih, 4)} <= 0: pembanding sederhana menang atau seri"
    elif selang is None:
        ok, alasan = False, "belum ada selang"
    elif selang[0] <= 0:
        ok, alasan = False, f"batas bawah selang 95% {round(selang[0], 4)} <= 0: belum terbukti mengalahkan pembanding"
    else:
        ok, alasan = True, f"selisih {round(selisih, 4)} > 0 dan batas bawah selang 95% {round(selang[0], 4)} > 0"
    if prospektif and vonis != "lolos":
        ok, alasan = False, f"{alasan}; vonis prospektif = {vonis!r}, wajib 'lolos'"
    return ok, alasan


def entri_ringkas(metrik, arah, pembanding, n, skor_model, skor_pembanding, selang_selisih=None, sumber=None,
                  vonis=None, prospektif=False, arah_teks=None, **ekstra):
    """Entri dari angka agregat. selang_selisih = [bawah, atas] untuk selisih 'model lebih baik positif' (bukan model-minus-pembanding)."""
    tanda = 1 if arah == "tinggi" else -1
    sel = None if skor_model is None or skor_pembanding is None else tanda * (skor_model - skor_pembanding)
    ok, alasan = putusan(sel, tuple(selang_selisih) if selang_selisih else None, vonis, prospektif)
    e = {"metrik": metrik, "arah": arah_teks or arah, "pembanding": pembanding, "n": n, "skor_model": r4(skor_model), "skor_pembanding": r4(skor_pembanding),
         "selisih": r4(sel), "selang95": [r4(selang_selisih[0]), r4(selang_selisih[1])] if selang_selisih else None, "boleh_tampil": ok, "alasan": alasan}
    e["vonis_prospektif"] = vonis
    if sumber is not None:
        e["sumber_berkas"] = sumber
    e.update({k: v for k, v in ekstra.items() if v is not None})
    return e


def entri(metrik, arah, pembanding, model, pemb, sumber, catatan=None, rincian=None, arah_teks=None):
    """Entri dari daftar skor per kasus sejajar (bootstrap berpasangan atas kasus). Urutan kunci = format lama karhutla."""
    n = len(model)
    tanda = 1 if arah == "tinggi" else -1
    sl = selang_berpasangan([tanda * (a - c) for a, c in zip(model, pemb)])
    ok, alasan = putusan(sl[0] if sl else None, (sl[1], sl[2]) if sl else None)
    e = {"metrik": metrik, "arah": arah_teks or arah, "pembanding": pembanding, "n": n, "skor_model": r4(sum(model) / n), "skor_pembanding": r4(sum(pemb) / n),
         "selisih": r4(sl[0]) if sl else None, "selang95": [r4(sl[1]), r4(sl[2])] if sl else None, "boleh_tampil": ok, "alasan": alasan, "sumber_berkas": sumber}
    if catatan:
        e["catatan"] = catatan
    if rincian:
        e["rincian"] = rincian
    return e


def kosong(metrik, alasan, sumber=None, pembanding=None, arah="rendah"):
    """Keluaran yang buktinya belum ada: selalu boleh_tampil=false (gagal-tertutup)."""
    return {"metrik": metrik, "arah": arah, "pembanding": pembanding, "n": None, "skor_model": None, "skor_pembanding": None, "selisih": None, "selang95": None,
            "vonis_prospektif": None, "boleh_tampil": False, "alasan": alasan, "sumber_berkas": sumber or []}


def jalur(bencana, akar=AKAR):
    return os.path.join(akar, "public", "data", "gerbang", f"{bencana}.json")


def tulis(bencana, keluaran, akar=AKAR):
    """Tulis public/data/gerbang/<bencana>.json ('dibuat' kunci pertama). Menolak > 100 KB. Mengembalikan jalur."""
    out = {"dibuat": time.strftime("%Y-%m-%d"), "versi": 1, "keluaran": keluaran}
    teks = json.dumps(out, ensure_ascii=False, indent=1)
    if len(teks.encode("utf-8")) >= BATAS_BYTE:
        raise ValueError(f"gerbang {bencana}: {len(teks.encode('utf-8'))} byte >= {BATAS_BYTE}")
    p = jalur(bencana, akar)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        f.write(teks)
    os.replace(p + ".tmp", p)
    return p


def uji():
    nan, inf = float('nan'), float('inf')
    assert putusan(nan, (nan, nan))[0] is False and putusan(inf, (1, 2))[0] is False and putusan(0.1, (nan, 1))[0] is False and putusan(True, (1, 2))[0] is False
    import tempfile
    assert putusan(.1, (.02, .2))[0] is True
    assert putusan(.1, (-.01, .2))[0] is False and putusan(.1, (0.0, .2))[0] is False
    assert putusan(-.1, (-.2, -.01))[0] is False and putusan(0.0, (0.0, 0.0))[0] is False and putusan(None, None)[0] is False
    assert putusan(.1, None) == (False, "belum ada selang")
    ok, al = putusan(.1, (.02, .2), "gagal", True)
    assert ok is False and "'gagal'" in al and putusan(.1, (.02, .2), "lolos", True)[0] is True
    assert putusan(.1, (.02, .2), None, True)[0] is False
    # entri_ringkas: arah rendah dibalik; tanpa selang = false; selang melewati nol = false; vonis prospektif wajib
    e = entri_ringkas("mae", "rendah", "persistensi", 100, 10.0, 15.0, [1.0, 9.0])
    assert e["boleh_tampil"] and e["selisih"] == 5.0 and e["vonis_prospektif"] is None
    assert entri_ringkas("mae", "rendah", "p", 100, 10.0, 15.0)["alasan"] == "belum ada selang"
    assert not entri_ringkas("mae", "rendah", "p", 100, 10.0, 15.0, [-1.0, 9.0])["boleh_tampil"]
    assert not entri_ringkas("mae", "rendah", "p", 100, 17.0, 15.0, [-5.0, -1.0])["boleh_tampil"]               # model kalah
    assert not entri_ringkas("mae", "rendah", "p", 100, None, 15.0, [1.0, 9.0])["boleh_tampil"]               # skor hilang
    assert not entri_ringkas("csi", "tinggi", "p", 9, .5, .3, [.1, .3], vonis="belum_cukup_data", prospektif=True)["boleh_tampil"]
    assert entri_ringkas("csi", "tinggi", "p", 9, .5, .3, [.1, .3], vonis="lolos", prospektif=True)["boleh_tampil"]
    assert kosong("x", "belum ada")["boleh_tampil"] is False
    # bootstrap berpasangan per kasus
    rnd = random.Random(1)
    sp = [rnd.random() for _ in range(80)]
    assert entri("m", "tinggi", "p", [x + .05 + rnd.random() * .02 for x in sp], sp, [])["boleh_tampil"]
    assert not entri("m", "tinggi", "p", [x - .05 for x in sp], sp, [])["boleh_tampil"]
    assert not entri("m", "tinggi", "p", [x + rnd.gauss(0, .3) for x in sp], sp, [])["boleh_tampil"]
    assert entri("g", "rendah", "p", [x - .2 for x in sp], sp, [])["boleh_tampil"]
    assert not entri("m", "tinggi", "p", [1.0, 2.0], [1.0, 2.0], [])["boleh_tampil"]
    assert selang_berpasangan([]) is None
    # tulis: kunci pertama dibuat, batas ukuran ditolak
    with tempfile.TemporaryDirectory() as d:
        p = tulis("uji", {"a": kosong("m", "belum ada")}, akar=d)
        j = json.load(open(p, encoding="utf-8"))
        assert next(iter(j)) == "dibuat" and j["versi"] == 1 and j["keluaran"]["a"]["boleh_tampil"] is False
        try:
            tulis("besar", {"a": {"x": "y" * BATAS_BYTE}}, akar=d)
            raise SystemExit("gagal: berkas > 100 KB tidak ditolak")
        except ValueError:
            pass
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: python3 -I scripts/umum/gerbang.py uji")
