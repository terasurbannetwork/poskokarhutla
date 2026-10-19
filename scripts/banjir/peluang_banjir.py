"""Peluang hujan lebat per wilayah (P1/P2/P11) -> public/banjir/data/peluang.json, kontrak peluang/1 (scripts/umum/peluang.py).

Tanpa panggilan jaringan: membaca hujan_ansambel.json (ECMWF IFS ENS 51 anggota, ansambel_hujan.py) dan pusat_kec.json.
Per titik (satu per kotak 1 derajat) berkas itu menyimpan peluang yang sudah dihitung dari anggota:
  p50 = P(hujan harian >= 50 mm), p100 = P(hujan harian >= 100 mm), p3 = P(jumlah 3 hari >= 100 mm),
  q = persentil 10/50/90 hujan harian. Besaran utama kontrak = hujan harian; p3 ikut sebagai medan tambahan "p3" per hari.

Agregasi wilayah (MAKSIMUM, bukan peluang "di mana saja"; angka sebenarnya P(minimal satu titik) >= maksimum ini):
  kabupaten  = maksimum atas titik 1 derajat terdekat (<= 1 derajat) dari tiap kecamatannya
  provinsi   = maksimum atas titik milik kabupaten-kabupatennya
  nasional   = maksimum atas semua titik
p10/p50/p90 wilayah = maksimum persentil titik yang sama (kotak terbasah). Kabupaten tanpa sinyal sama sekali (tidak ada anggota
yang melewati 50 mm/hari dan 100 mm/3 hari sepanjang horizon) tidak ditulis, dicatat di "tanpa_sinyal" supaya berkas muat < 400 KB.

Horizon = hari yang dimiliki ansambel (hari ini .. +7 = 8 hari). ensemble-api Open-Meteo menyediakan sampai 15 hari; biaya
menaikkannya dihitung di laporan (ECMWF IFS 0,25 derajat 51 anggota, tarif per panggilan naik untuk > 14 hari), TIDAK dinaikkan di sini.

Pakai:  python3 scripts/banjir/peluang_banjir.py      |  python3 scripts/banjir/peluang_banjir.py uji
Jalankan sesudah ansambel_hujan.py (dan status.py/uji_balik.py bila validasi.json diperbarui).
"""
import datetime as dt, importlib.util, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, baca, simpan
from wilayah import AKAR, PROVINSI

AMBANG = [{"k": "lebat", "label": "Hujan harian 50 mm atau lebih (lebat)", "nilai": 50},
          {"k": "sangat_lebat", "label": "Hujan harian 100 mm atau lebih (sangat lebat)", "nilai": 100}]
KEJADIAN = ["hujan harian 50 mm atau lebih", "hujan harian 100 mm atau lebih"]
BATAS_DERAJAT = 1.0
BATAS_BYTE = 400 * 1024


def _peluang():
    s = importlib.util.spec_from_file_location("umum_peluang", os.path.join(AKAR, "scripts/umum/peluang.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


PL = _peluang()


def _maks(xs):
    xs = [x for x in xs if x is not None]
    return max(xs) if xs else None


def agregat(ens, idx, i0, n):
    """Maksimum atas titik `idx` (indeks ke ens["grid"]) untuk n hari mulai indeks hari i0 -> daftar entri hari kontrak."""
    out = []
    for d in range(i0, i0 + n):
        g = [ens["grid"][i] for i in idx]
        q = [_maks([x["q"][k][d] for x in g if "q" in x]) for k in range(3)]
        out.append({"t": ens["hari"][d], "p": [_maks([x["p50"][d] for x in g]), _maks([x["p100"][d] for x in g])],
                    "p10": q[0], "p50": q[1], "p90": q[2], "p3": _maks([x["p3"][d] for x in g])})
    return out


def vonis(hs, tempat):
    """Kalimat untuk ambang pertama (hujan lebat 50 mm/hari): yang paling sering terjadi, jadi paling berguna dibaca."""
    return PL.vonis(hs, [a["nilai"] for a in AMBANG], 0, KEJADIAN[0], tempat)


def vonis_3hari(hs, tempat):
    h3 = [{"t": h["t"], "p": [h["p3"]]} for h in hs]
    return PL.vonis(h3, [100], 0, "jumlah hujan 3 hari 100 mm atau lebih", tempat)


def sinyal(hs):
    return any((h["p"][0] or 0) > 0 or (h["p"][1] or 0) > 0 or (h["p3"] or 0) > 0 for h in hs)


def uji_balik(val):
    """Ringkasan skor uji balik status Siaga banjir dari validasi.json. Ini deterministik (ERA5 sebagai prakiraan sempurna),
    BUKAN keandalan peluang ansambel; keandalan peluang belum ada (prospektif.py hanya mencatat kabupaten berpeluang >= 10%)."""
    s = ((val or {}).get("banjir") or {}).get("siaga")
    if not s:
        return None
    return {"jenis": "status Siaga banjir (deterministik, ERA5 sebagai prakiraan sempurna), bukan keandalan peluang ansambel",
            "periode_uji": val.get("periode_uji"), "kabupaten": val["banjir"].get("kab"),
            "pod": s["pod"], "far": s["far"], "ets": s["ets"], "ci_ets": s["ci"]["ets"], "ci_pod": s["ci"]["pod"], "ci_far": s["ci"]["far"],
            "keandalan_peluang": "belum diukur: butuh catatan prospektif peluang semua kabupaten (skor Brier/diagram keandalan)"}


def bangun(ens, pusat, hari_ini, val=None):
    """ens: hujan_ansambel.json; pusat: {'prov|kab|kec': [lat, lon]}; hari_ini: 'YYYY-MM-DD'. -> isi berkas peluang/1."""
    i0 = next((i for i, t in enumerate(ens["hari"]) if t >= hari_ini), None)
    if i0 is None:
        raise SystemExit(f"hujan_ansambel.json basi (hari terakhir {ens['hari'][-1]} < {hari_ini}); jalankan ansambel_hujan.py")
    n = len(ens["hari"]) - i0
    grid = ens["grid"]
    kab_titik = {}
    for k, (la, lo) in pusat.items():
        p, kab, _ = k.split("|")
        j = min(range(len(grid)), key=lambda i: (grid[i]["lat"] - la) ** 2 + (grid[i]["lon"] - lo) ** 2)
        if abs(grid[j]["lat"] - la) <= BATAS_DERAJAT and abs(grid[j]["lon"] - lo) <= BATAS_DERAJAT:
            kab_titik.setdefault((p, kab), set()).add(j)
    prov_titik = {}
    for (p, _), s in kab_titik.items():
        prov_titik.setdefault(p, set()).update(s)
    wil = {"ID": {"nama": "Indonesia (kotak prakiraan 1 derajat terbasah)", "tingkat": "nasional", "hari": agregat(ens, range(len(grid)), i0, n)}}
    wil["ID"]["vonis"] = vonis(wil["ID"]["hari"], "di sebagian Indonesia")
    wil["ID"]["vonis_3hari"] = vonis_3hari(wil["ID"]["hari"], "di sebagian Indonesia")
    for p in sorted(prov_titik):
        hs = agregat(ens, sorted(prov_titik[p]), i0, n)
        t = f"di sebagian {PROVINSI[p]}"
        wil[p] = {"nama": PROVINSI[p], "tingkat": "provinsi", "hari": hs, "vonis": vonis(hs, t), "vonis_3hari": vonis_3hari(hs, t)}
    tanpa = []
    for (p, kab), s in sorted(kab_titik.items()):
        hs = agregat(ens, sorted(s), i0, n)
        if sinyal(hs):
            wil[f"{p}|{kab}"] = {"nama": f"{kab}, {PROVINSI[p]}", "tingkat": "kabupaten", "hari": hs, "vonis": vonis(hs, f"di {kab}")}
        else:
            tanpa.append(f"{p}|{kab}")
    anggota = ens["anggota"]
    batasan = [
        "Hujan bukan banjir: peluang di sini hanya untuk curah hujan; banjir bergantung pada tanah, sungai, drainase, pasang laut, dan bendungan.",
        f"Resolusi ECMWF IFS ENS 0,25 derajat (~28 km); satu titik mewakili kotak 1 derajat (~110 km), jadi hujan lokal lebat (badai konveksi) tidak tertangkap dan beberapa kabupaten berbagi titik yang sama.",
        "\"Di sebagian\" berarti di kotak prakiraan (~100 km) yang terbasah di wilayah itu: angka provinsi/nasional adalah MAKSIMUM atas kotak, bukan peluang rata-rata; kabupaten memakai kotak terdekat dari kecamatannya. Peluang ada kotak yang melewati ambang paling kecil sama dengan angka itu.",
        f"Peluang = pecahan dari {anggota} anggota ansambel bobot sama; bukan terkalibrasi (belum ada diagram keandalan). 8 hari pertama saja; makin jauh makin menyebar.",
        f"{len(tanpa)} kabupaten tidak ditulis karena tak ada anggota yang melewati 50 mm/hari atau 100 mm/3 hari sepanjang horizon (lihat tanpa_sinyal); itu bukan jaminan tanpa hujan.",
    ]
    d = PL.berkas("banjir", f"ECMWF IFS ENS {anggota} anggota via Open-Meteo Ensemble API (hujan_ansambel.json, dibuat {ens['dibuat']})", anggota,
                  {"label": "Hujan harian", "satuan": "mm", "desimal": 0}, AMBANG, wil, batasan, uji_balik(val))
    d["tanpa_sinyal"] = tanpa
    d["agregasi"] = "maksimum atas titik 1 derajat; p3 = P(jumlah 3 hari mulai hari itu >= 100 mm)"
    return d


def main():
    ens = baca(os.path.join(KELUAR, "hujan_ansambel.json"))
    pusat = baca(os.path.join(KELUAR, "pusat_kec.json"))
    if not ens or not pusat:
        sys.exit("hujan_ansambel.json / pusat_kec.json belum ada")
    d = bangun(ens, pusat, dt.datetime.now(WIB).date().isoformat(), baca(os.path.join(KELUAR, "validasi.json")))
    jalur = os.path.join(KELUAR, "peluang.json")
    simpan(jalur, d)
    kb = os.path.getsize(jalur) / 1024
    print(f"peluang.json: {len(d['wilayah'])} wilayah, {len(d['tanpa_sinyal'])} kab tanpa sinyal, {len(d['wilayah']['ID']['hari'])} hari, {kb:.0f} KB", file=sys.stderr)
    if kb * 1024 > BATAS_BYTE:
        sys.exit(f"peluang.json {kb:.0f} KB melebihi 400 KB")


def uji():
    def tk(lat, lon, p50, p100, p3, q):
        return {"lat": lat, "lon": lon, "prov": "32", "p50": p50, "p100": p100, "p3": p3, "q": q}
    z = [0] * 3
    ens = {"dibuat": "x", "anggota": 51, "hari": ["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21"], "grid": [
        tk(-6.5, 106.5, [0, .2, .6, .1], [0, 0, .1, 0], [0, .1, .3, 0], [[0] * 4, [1, 5, 40, 3], [4, 30, 90, 20]]),
        tk(-6.5, 107.5, [0, .1, .3, .0], [0, 0, 0, 0], [0, 0, .1, 0], [[0] * 4, [0, 2, 20, 1], [2, 12, 60, 8]]),
        tk(-8.5, 120.5, [0] * 4, [0] * 4, [0] * 4, [[0] * 4, [0] * 4, [0] * 4])]}
    pusat = {"32|Bogor|A": [-6.5, 106.6], "32|Bogor|B": [-6.5, 107.4], "32|Kota Z|C": [-6.4, 107.5], "53|Sumba|D": [-8.5, 120.4], "53|Jauh|E": [-1.0, 130.0]}
    val = {"periode_uji": "2022-2025", "kab": 42, "banjir": {"kab": 42, "siaga": {"pod": .1, "far": .9, "ets": .03, "ci": {"ets": [.02, .04], "pod": [.1, .2], "far": [.8, .9]}}}}
    d = bangun(ens, pusat, "2026-10-19", val)
    assert PL.periksa(d) == [] and len(d["wilayah"]["ID"]["hari"]) == 3, "hari 18 Okt dibuang (sebelum hari ini)"
    b = d["wilayah"]["32|Bogor"]["hari"]
    assert b[1]["p"] == [.6, .1] and b[1]["p90"] == 90 and b[1]["p3"] == .3, b[1]  # maksimum atas dua titik, bukan rerata
    assert d["wilayah"]["32|Kota Z"]["hari"][1]["p"] == [.3, 0], "kab dengan satu titik memakai titik itu"
    assert d["tanpa_sinyal"] == ["53|Sumba"] and "53|Jauh" not in d["wilayah"] and "53|Jauh" not in d["tanpa_sinyal"], "titik > 1 derajat: dibuang, bukan dikarang"
    v = d["wilayah"]["32|Bogor"]["vonis"]
    assert "50 mm" in v and "60%" in v and "Selasa, 20 Oktober" in v and "cukup mungkin" in v, v
    assert "di sebagian 32" not in d["wilayah"]["32"]["vonis"] and "di sebagian Jawa Barat" in d["wilayah"]["32"]["vonis"] and "kotak prakiraan" not in d["wilayah"]["32"]["vonis"]
    assert "100 mm" in d["wilayah"]["ID"]["vonis_3hari"] and d["uji_balik"]["pod"] == .1 and d["uji_balik"]["ci_ets"] == [.02, .04]
    try:
        bangun(ens, pusat, "2026-11-01")
        assert False
    except SystemExit:
        pass
    print("ok peluang_banjir")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
