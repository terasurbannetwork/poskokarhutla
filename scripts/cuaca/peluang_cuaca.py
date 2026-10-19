"""Peluang hujan ekstrem per kabupaten/kota dan provinsi, 8 hari -> public/banjir/data/cuaca_peluang.json (kontrak peluang/1)

Bukan model kedua: memakai peluang yang SUDAH dihitung ansambel ECMWF IFS 51 anggota (banjir/ansambel_hujan.py -> hujan_ansambel.json,
dipakai juga cuaca_kec.json). Anggota per hari tidak disimpan di berkas itu, jadi p10/p50/p90 sengaja kosong (tidak dikarang).
Ambang = kelas hujan lebat/sangat lebat BMKG yang dipakai dasar.HUJAN (50, 100 mm/hari). Kabupaten memakai titik ansambel terdekat
<= dasar.JARAK_ANSAMBEL_KM (satu titik mewakili kotak 1 derajat); provinsi = nilai TERTINGGI di antara titik yang mewakili kab/kotanya (bukan rata-rata).
Angin kencang tidak dipilih: embusan hanya deterministik (cuaca_kec.json), tanpa anggota tidak ada peluang.
Pakai: python3 scripts/cuaca/peluang_cuaca.py   |   python3 scripts/cuaca/peluang_cuaca.py uji
"""
import importlib.util, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, HUJAN, KELUAR, JARAK_ANSAMBEL_KM, MASUKAN, PROVINSI, baca, simpan, titik_terdekat

OUT = KELUAR   # public/banjir/data: hanya folder ini yang di-commit banjir.yml


def _umum():
    s = importlib.util.spec_from_file_location("peluang_umum", os.path.join(AKAR, "scripts/umum/peluang.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


P = _umum()
AMBANG = [{"k": "lebat", "label": "Hujan lebat (50 mm/hari atau lebih)", "nilai": HUJAN[0]},
          {"k": "sangat_lebat", "label": "Hujan sangat lebat (100 mm/hari atau lebih)", "nilai": HUJAN[1]}]
BATASAN = [
    "Peluang adalah pecahan dari 51 anggota ansambel ECMWF pada titik terdekat (satu titik mewakili kotak 1 derajat, sekitar 110 km); hujan lokal yang sempit bisa tidak terwakili.",
    "Nilai provinsi adalah titik tertinggi di provinsi itu, bukan rata-rata: artinya 'di salah satu tempat', bukan 'di seluruh provinsi'.",
    "Ansambel belum diuji balik kalibrasinya; uji balik di bawah adalah untuk alarm deterministik, bukan untuk angka peluang ini.",
    "Peringatan resmi tetap dari BMKG; angka ini bukan peringatan dini.",
]


def bangun(ans, kota, verif=None, hari_ini=None):
    hari = ans["hari"]
    if hari_ini:
        hari = [d for d in hari if d >= hari_ini]
    ia = [ans["hari"].index(d) for d in hari]
    pts = [(g["lat"], g["lon"], g["p50"], g["p100"], g["prov"]) for g in ans["grid"]]

    def ent(titik_list):
        """titik_list: ansambel titik yang mewakili; ambil maks per hari per ambang."""
        out = []
        for d, i in zip(hari, ia):
            p = []
            for k in (2, 3):
                v = [t[k][i] for t in titik_list if t[k][i] is not None]
                p.append(round(max(v), 4) if v else None)
            if p[1] is not None and p[0] is not None and p[1] > p[0]:
                p[1] = p[0]
            out.append({"t": d, "p": p})
        return out

    def vonis(hs, tempat):
        i = max((j for j in (0, 1) if any(h["p"][j] and h["p"][j] >= 0.20 for h in hs)), default=0)
        return P.vonis(hs, AMBANG, i, "hujan 50 mm/hari atau lebih" if i == 0 else "hujan 100 mm/hari atau lebih", tempat)

    wil, per_prov = {}, {}
    for k in kota:
        e = titik_terdekat(pts, k["lat"], k["lon"], JARAK_ANSAMBEL_KM)
        if not e:
            continue
        t = pts[e[0]]
        hs = ent([t])
        if all(h["p"][0] is None for h in hs):
            continue
        wil[k["kode"]] = {"nama": k["nama"], "tingkat": "kabupaten", "hari": hs, "vonis": vonis(hs, "di " + k["nama"])}
        per_prov.setdefault(k["prov"], {})[e[0]] = t
    for pk, tt in per_prov.items():
        hs = ent(list(tt.values()))
        nm = PROVINSI.get(pk, pk)
        wil[pk] = {"nama": nm, "tingkat": "provinsi", "hari": hs, "vonis": vonis(hs, "di salah satu tempat di " + nm)}
    uji = None
    kt = (verif or {}).get("kita")
    if kt and kt.get("lead"):
        uji = {"jenis": "alarm deterministik hujan >= 50 mm (bukan peluang ansambel)", "periode": kt.get("periode"), "acuan": kt.get("acuan"),
               "lead": kt["lead"], "catatan": "pod/far/csi pasangan provinsi-hari terhadap DIBI; DIBI hanya mencatat kejadian yang dilaporkan, jadi far pesimis dan pod optimis."}
    return P.berkas("cuaca", f"Ansambel ECMWF IFS {ans.get('anggota')} anggota via Open-Meteo (dibuat {ans.get('dibuat')}); kab/kota: scripts/udara/kota.json",
                    ans.get("anggota"), {"label": "Hujan harian", "satuan": "mm", "desimal": 0}, AMBANG, wil, BATASAN, uji)


def main():
    ans = baca(os.path.join(MASUKAN, "hujan_ansambel.json"))
    if not ans:
        raise RuntimeError("hujan_ansambel.json tidak ada")
    kota = json.load(open(os.path.join(AKAR, "scripts/udara/kota.json")))
    k = [dict(zip(kota["kolom"], r)) for r in kota["baris"]]
    verif = baca(os.path.join(MASUKAN, "cuaca_verifikasi.json"))
    d = bangun(ans, k, verif)
    print(f"peluang_cuaca: {len(d['wilayah'])} wilayah, {(simpan(os.path.join(OUT, 'cuaca_peluang.json'), d), os.path.getsize(os.path.join(OUT, 'cuaca_peluang.json')))[1]} B")


def uji():
    ans = {"anggota": 51, "dibuat": "x", "hari": ["2026-10-19", "2026-10-20"],
           "grid": [{"lat": 0.0, "lon": 100.0, "prov": "13", "p50": [0.6, 0.0], "p100": [0.1, 0.0], "p3": [0, 0]},
                    {"lat": 0.2, "lon": 100.2, "prov": "13", "p50": [0.2, 0.3], "p100": [0.3, 0.0], "p3": [0, 0]}]}
    kota = [{"kode": "1301", "nama": "Kab. A", "prov": "13", "lat": 0.01, "lon": 100.01}, {"kode": "9999", "nama": "Jauh", "prov": "91", "lat": -8, "lon": 130}]
    d = bangun(ans, kota)
    assert P.periksa(d) == [] and "9999" not in d["wilayah"]
    a, pr = d["wilayah"]["1301"], d["wilayah"]["13"]
    assert a["hari"][0]["p"] == [0.6, 0.1], a
    assert pr["hari"][0]["p"] == [0.6, 0.1] and pr["hari"][1]["p"] == [0.0, 0.0], pr   # provinsi = maks titik yang mewakili kab-nya
    assert "cukup mungkin" in a["vonis"] and "salah satu tempat" in pr["vonis"], (a["vonis"], pr["vonis"])
    print("peluang_cuaca.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:2] == ["uji"] else main()
