"""Arsip prospektif cuaca, append-only -> public/banjir/data/cuaca_prospektif_<tahun-bulan>.json (M4, pola scripts/banjir/prospektif.py)

Tiap hari satu entri "tanggal terbit" (= hari_ini cuaca_prakiraan.json): untuk d+0..d+2 per kabupaten
  [hujan harian maks mm, embusan maks km/jam, kecamatan Waspada, kecamatan Siaga, kecamatan Awas]   (maks atas kecamatan kab itu, sel 0,25 derajat terdekat)
  {"terbit": {"2026-11-02": {"hari": [3 tanggal], "kab": {"prov|kab": [[mm,g,w,s,a] x3]}}}}
Kabupaten hanya ditulis bila hujan >= 30 mm, embusan >= 45 km/jam, atau ada kecamatan Waspada+ (nilai dekat ambang 50 mm / 54 km/jam ikut, supaya
ambang bisa diuji ulang); yang tidak tertulis berarti di bawah itu. Hitungan kecamatan None = cuaca_kec.json tidak cocok harinya (tidak dikarang jadi 0).
Satu berkas per bulan: bulan lampau tidak pernah disentuh lagi, tanpa plafon yang harus memotong sejarah (~100-200 kab x ~60 B x 30 hari = <= 400 KB/bulan).
Aturan: entri TIDAK PERNAH diubah atau dihapus (jalan ulang di hari yang sama dilewati: prakiraan pertama hari itu yang dinilai); berkas rusak = berhenti.
Embusan belum pernah diarsipkan sebelumnya, jadi ambangnya baru bisa diuji sesudah 6-12 bulan arsip ini. Penilaian ke METAR/logbook: belum ada (menunggu data).
Pakai: python3 scripts/cuaca/prospektif_cuaca.py   |   ... uji
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, MASUKAN, Kisi, baca, hari_wib, simpan

MIN_MM, MIN_KMJ = 30, 45
KOLOM = ["mm", "kmj", "waspada", "siaga", "awas"]


def entri(prak, kec, pusat):
    """cuaca_prakiraan + cuaca_kec + pusat_kec -> (tanggal terbit, entri)."""
    hh, h0 = prak["hari"], prak["hari_ini"]
    hari = hh[hh.index(h0):hh.index(h0) + 3]
    kisi = Kisi([(r[0], r[1], r[2], r[3], r[4]) for r in prak["sel"]])
    off = hh.index(h0)
    cocok = kec is not None and kec.get("hari") == hari
    kab = {}
    for i, (k, (la, lo)) in enumerate(pusat.items()):
        c = kisi.dekat(la, lo)
        if not c:
            continue
        v = kab.setdefault("|".join(k.split("|")[:2]), [[0, 0, 0 if cocok else None, 0 if cocok else None, 0 if cocok else None] for _ in hari])
        for n in range(len(hari)):
            v[n][0] = max(v[n][0], int(round(c[3][off + n] or 0)))
            v[n][1] = max(v[n][1], int(round(c[4][off + n] or 0)))
    if cocok:
        kunci = list(pusat)
        for r in kec["kec"]:
            v = kab.get("|".join(kunci[r[0]].split("|")[:2]))
            for n, t in enumerate(r[1]):
                if v and t:
                    v[n][1 + t] += 1
    keep = {k: v for k, v in kab.items() if any(x[0] >= MIN_MM or x[1] >= MIN_KMJ or sum(y or 0 for y in x[2:]) for x in v)}
    return h0, {"hari": hari, "kab": keep}


def tambah(isi, terbit, e):
    """Gabungkan satu entri; sudah ada = tidak diubah. -> (isi, ditambah?)"""
    if terbit in isi["terbit"]:
        return isi, False
    isi["terbit"][terbit] = e
    return isi, True


def main():
    prak = baca(os.path.join(KELUAR, "cuaca_prakiraan.json"))
    pusat = baca(os.path.join(KELUAR, "pusat_kec.json"))
    if not prak or not pusat:
        raise RuntimeError("cuaca_prakiraan.json atau pusat_kec.json tidak ada")
    t, e = entri(prak, baca(os.path.join(KELUAR, "cuaca_kec.json")), pusat)
    jalur = os.path.join(KELUAR, f"cuaca_prospektif_{t[:7]}.json")
    if os.path.exists(jalur):
        try:
            isi = json.load(open(jalur))
            assert isinstance(isi["terbit"], dict)
        except Exception as x:
            raise RuntimeError(f"{jalur} rusak ({x}): berhenti, tidak memulai log baru diam-diam")
    else:
        isi = {"versi": 1, "bulan": t[:7], "kolom": KOLOM, "ambang_catat": {"mm": MIN_MM, "kmj": MIN_KMJ},
               "sumber": "Open-Meteo kisi 0,25 derajat + Status kecamatan cuaca_kec.json; prakiraan yang benar-benar terbit, tidak diubah sesudahnya", "terbit": {}}
    isi, baru = tambah(isi, t, e)
    if baru:
        simpan(jalur, isi)
    print(f"cuaca prospektif: {t} {'ditambah' if baru else 'sudah ada, dilewati'}, {len(e['kab'])} kab, {len(isi['terbit'])} tanggal terbit di {os.path.basename(jalur)}", file=sys.stderr)


def uji():
    pr = {"hari": ["a", "b", "c", "d"], "hari_ini": "b", "sel": [[1.125, 2.125, "11", [0, 60, 10, 0], [10, 20, 50, 5]], [1.125, 2.375, "11", [0, 5, 5, 5], [1, 1, 1, 1]]]}
    pusat = {"11|K|Satu": [1.2, 2.2], "11|K|Dua": [1.2, 2.4], "12|L|Tiga": [1.2, 2.45]}
    kec = {"hari": ["b", "c", "d"], "kec": [[0, [2, 1, 0]], [1, [0, 0, 0]]]}
    t, e = entri(pr, kec, pusat)
    assert t == "b" and e["hari"] == ["b", "c", "d"] and set(e["kab"]) == {"11|K"}, e   # 12|L: semua di bawah ambang -> tak ditulis
    assert e["kab"]["11|K"] == [[60, 20, 0, 1, 0], [10, 50, 1, 0, 0], [5, 5, 0, 0, 0]], e
    t2, e2 = entri(pr, {"hari": ["x"], "kec": []}, pusat)
    assert e2["kab"]["11|K"][0][2:] == [None] * 3          # harinya beda: None, bukan 0
    isi = {"terbit": {}}
    assert tambah(isi, t, e)[1] and not tambah(isi, t, {"hari": [], "kab": {}})[1] and isi["terbit"]["b"] is e   # entri pertama tidak ditimpa
    print("ok prospektif_cuaca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
