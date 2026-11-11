"""Uji balik kaji cepat terhadap pengamatan (SK-056; ALGORITMA F3.5). Fungsi murni.

Tiap kejadian arsip i: keluaran model m_i, pengamatan o_i. g_i = ln(m_i / o_i) hanya bila m_i > 0 dan o_i > 0; selain itu dicatat `tak_dihitung`.
bias = rerata g_i; faktor = exp(akar(rerata g_i^2)); cakupan = jumlah i dengan bawah_i <= o_i <= atas_i, dibagi n (yang dihitung). bawah/atas bawaan m/PITA dan m x PITA.
Cakupan memakai rentang gabungan PAGER dan ITB (bawah = terendah, atas = tertinggi keduanya) bila pasangan dari keduanya: kirim bawah/atas eksplisit; tanpa itu pita model tunggal.
ASAL PENGAMATAN: dari_kalibrasi mengukur model kerapuhan sendiri (public/gempa/kerusakan.js) terhadap korban jiwa 8 gempa yang ditulis dari ingatan, belum dicocokkan ke halaman sumber, dan pengalinya disetel pada 8 gempa yang sama (IN-SAMPLE, bias hampir nol karena disetel). Ini BUKAN uji balik PAGER atau ITB; keduanya belum diuji balik.
Tiap sumber pengamatan (DIBI meninggal, rumah_rusak, ...) diuji TERPISAH, tidak digabung. TIDAK ada ambang "lolos" (U18): angka tampil apa adanya, label tetap estimasi-model.
Pakai: python3 -I scripts/siklus/ujibalik.py uji | kalibrasi
"""
import importlib.util, json, math, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
YAKIN = "estimasi-model"


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


PITA = _muat("konst").PITA
KAL = os.path.join(AB, "../../public/gempa/data/kalibrasi_kerusakan.json")


def _angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def uji_balik(pasangan):
    """pasangan [{id, m, o[, bawah, atas]}] -> {n, tak_dihitung[], bias, faktor, cakupan, yakin}. Tanpa pasangan terhitung: bias, faktor, cakupan None (menunggu), bukan 0."""
    g, dalam, tak = [], 0, []
    for p in pasangan:
        m, o = p.get("m"), p.get("o")
        if not (_angka(m) and _angka(o) and m > 0 and o > 0):
            tak.append({"id": p.get("id"), "alasan": "keluaran atau pengamatan kosong atau nol"})
            continue
        g.append(math.log(m / o))
        b, a = p.get("bawah", m / PITA), p.get("atas", m * PITA)
        dalam += b <= o <= a
    n = len(g)
    return {"n": n, "tak_dihitung": tak, "bias": round(sum(g) / n, 4) if n else None, "faktor": round(math.exp(math.sqrt(sum(x * x for x in g) / n)), 3) if n else None,
            "cakupan": [dalam, n] if n else None, "yakin": YAKIN}


def per_sumber(sumber):
    """{nama_sumber: pasangan} -> {nama_sumber: uji_balik}; tiap sumber berdiri sendiri."""
    return {k: uji_balik(v) for k, v in sumber.items()}


def dari_kalibrasi(jalur=KAL):
    """8 gempa kerak di kalibrasi_kerusakan.json: model kerapuhan sendiri lawan korban jiwa (ditulis dari ingatan). in_sample True; bias tidak dikeluarkan (disetel nol pada data yang sama)."""
    r = uji_balik([{"id": k["id"], "m": k["model"], "o": k["jiwa"]} for k in json.load(open(jalur, encoding="utf-8"))["kejadian"]])
    r.pop("bias")
    return {**r, "in_sample": True}


def _uji():
    # UJ-F3-07: kasus ALGORITMA F3.5
    r = uji_balik([{"id": "a", "m": 555, "o": 5700}, {"id": "b", "m": 149, "o": 104}, {"id": "c", "m": 105, "o": 20}])
    assert r["n"] == 3 and r["bias"] == -0.1038 and r["faktor"] == 5.279 and r["cakupan"] == [1, 3] and r["yakin"] == YAKIN, r
    # nol atau kosong dicatat tak_dihitung, bukan ikut dihitung
    r = uji_balik([{"id": "a", "m": 555, "o": 5700}, {"id": "n", "m": 0, "o": 5}, {"id": "k", "m": 7, "o": None}, {"id": "x", "m": 3, "o": 0}, {"id": "s", "m": "7", "o": 7}])
    assert r["n"] == 1 and [t["id"] for t in r["tak_dihitung"]] == ["n", "k", "x", "s"] and r["cakupan"] == [0, 1]
    # tanpa pasangan terhitung: menunggu (None), bukan 0
    r = uji_balik([{"id": "n", "m": 0, "o": 5}])
    assert r["n"] == 0 and r["bias"] is None and r["faktor"] is None and r["cakupan"] is None
    assert uji_balik([])["bias"] is None
    # rentang eksplisit dipakai; tepi termasuk
    assert uji_balik([{"m": 10, "o": 20, "bawah": 5, "atas": 20}])["cakupan"] == [1, 1]
    # tiap sumber terpisah, tidak ada total atau gabungan; tidak ada kunci ambang lolos
    s = per_sumber({"dibi": [{"id": "a", "m": 555, "o": 5700}], "rumah_rusak": [{"id": "a", "m": 0, "o": 100}]})
    assert s["dibi"]["n"] == 1 and s["rumah_rusak"]["n"] == 0 and set(s) == {"dibi", "rumah_rusak"}
    tampil = json.dumps(s)
    assert not any(k in tampil for k in ("lolos", "total", "rata", "ambang"))
    # data nyata: 8 gempa kalibrasi, tiga pertama memberi n yang sama dengan berkas
    k = dari_kalibrasi()
    assert k["n"] == 8 and k["faktor"] > 1 and k["cakupan"][1] == 8, k
    assert k["in_sample"] is True and "bias" not in k, "in-sample berlabel, bias tidak keluar"
    # rentang gabungan PAGER dan ITB: o di luar pita PAGER tapi di dalam gabungan dihitung dalam
    assert uji_balik([{"m": 10, "o": 200, "bawah": 2.5, "atas": 300}])["cakupan"] == [1, 1] and uji_balik([{"m": 10, "o": 200}])["cakupan"] == [0, 1]
    print("ujibalik: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        _uji()
    elif a == ["kalibrasi"]:
        print(json.dumps(dari_kalibrasi(), ensure_ascii=False))
    else:
        sys.exit("pakai: ujibalik.py uji | kalibrasi")
