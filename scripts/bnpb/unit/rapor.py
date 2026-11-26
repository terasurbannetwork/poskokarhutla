"""MB-6 Rapor dari data (ALGORITMA sec 7; DESAIN-TEKNIS sec 4.6; tiket RU-030).

Satu skema kartu untuk semua sistem bertampilan rapor; perendernya public/bnpb/unit/rapor.js.
Pustaka murni, bukan langkah jalan.py. berkas() mengembalikan isi berkas R2 unit/<nama>.json;
jalan.py yang menulisnya (atomik) dan menambah `dibuat` serta `basi_jam` (DT sec 9.4).

Selisih dengan DT sec 4.6, mengikuti AGENTS.md sec 3.5 pembaruan 11 Nov 2026 (menang atas DT):
kepala kartu = NAMA SEKSI berikon, bukan kalimat temuan. `judul` tidak memuat {n};
angka temuan masuk `angka` = [{k, label, nilai}] dan tampil di baris ringkas isi kartu.

  kartu(id, pil, judul, angka, kolom, baris, rumus, sumber, label, sistem=None, ikon="data", aturan=(), asumsi=(), tautan=(), unduh=None)
                          angka dan kolom angka boleh membawa desimal (0-6) untuk tampilan;
                          kolom teks boleh membawa tautan=<kunci baris> berisi jalur lokal (/bnpb/...);
                          tautan = [[jalur lokal, teks]] di kanan judul; unduh = nama berkas .csv (rapor.js membangun CSV dari baris)
  berkas(kartu, sumber)   -> {label, sumber, kartu}; sumber = [{nama, url, diambil, lisensi}] (MB-8)
  rata(nilai)             -> rata-rata tanpa None; None bila semua kosong (kosong tidak ikut rata-rata)
  periksa_berkas(d)       -> d; menolak berkas R2 yang skemanya salah

  python3 -I scripts/bnpb/unit/rapor.py --cek
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402

LABEL = ("resmi", "sekunder", "hitungan_kita", "proksi")  # P-7; teks pil DS sec 11.4 ada di rapor.js
PERLU_RUMUS = {"hitungan_kita", "proksi"}
IKON = ("data", "gudang", "rumah", "timbang", "toga", "kaca", "kalender", "resmi", "hitung", "peta", "uang", "orang")
BASI = (48, 240, 1080, None)
ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KUNCI = re.compile(r"^[a-z][a-z0-9_]*$")
JALUR = re.compile(r"^/(?!/)[A-Za-z0-9/_.\-]*(#[A-Za-z0-9=&%_.\-]*)?$")  # hanya jalur situs sendiri, tanpa skema dan tanpa //
UNDUH = re.compile(r"^[a-z0-9_\-]{1,60}\.csv$")
TERLARANG = (re.compile("\u00b7"), re.compile(r"\baman\b", re.I))  # tanpa titik tengah; tidak pernah "aman"
AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CONTOH = os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit", "r2", "contoh.json")


def _teks(x, nama, wajib=True, maks=400):
    if x is None and not wajib:
        return None
    if not isinstance(x, str) or not x.strip():
        raise ValueError(f"{nama} harus teks tak kosong, dapat {x!r}")
    if len(x) > maks:
        raise ValueError(f"{nama} lebih dari {maks} huruf")
    for r in TERLARANG:
        if r.search(x):
            raise ValueError(f"{nama} memuat {r.pattern!r}: {x!r}")
    return x


def _angka(x, nama):
    """Angka hingga atau None (belum ada data). Bool dan NaN ditolak; kosong tidak pernah jadi 0."""
    if x is None:
        return None
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x):
        raise ValueError(f"{nama}: {x!r} bukan angka hingga")
    return x


def _desimal(x):
    """Desimal tampil (ALGORITMA sec 0.7: rasio dan skor 2-4 desimal); tanpa kunci = bawaan format.js (1 desimal)."""
    if "desimal" not in x:
        return {}
    d = x["desimal"]
    if isinstance(d, bool) or not isinstance(d, int) or not 0 <= d <= 6:
        raise ValueError(f"desimal {d!r} harus bilangan bulat 0 sampai 6")
    return {"desimal": d}


def _label(label):
    daftar = [label] if isinstance(label, str) else label
    if not isinstance(daftar, (list, tuple)) or not daftar:
        raise ValueError("kartu tanpa label sumber")
    for x in daftar:
        if x not in LABEL:
            raise ValueError(f"label {x!r} di luar daftar {LABEL}")
    return list(dict.fromkeys(daftar))


def _pasal(kunci):
    e = jam.aturan(kunci)  # KeyError bila kunci tidak dikenal
    return {"kunci": kunci, "acuan": e.get("acuan"), "letak": e.get("letak"),
            "kutipan": e.get("kutipan"), "asumsi": bool(e.get("asumsi"))}


def _jalur(x, nama):
    if not isinstance(x, str) or not JALUR.fullmatch(x):
        raise ValueError(f"{nama}: {x!r} bukan jalur lokal /...")
    return x


def kartu(id, pil, judul, angka, kolom, baris, rumus, sumber, label, sistem=None, ikon="data", aturan=(), asumsi=(), tautan=(), unduh=None):
    """asumsi: teks pil Asumsi tanpa kunci Jam Aturan (konstanta skrip berlabel, ALGORITMA 0.1 butir 3; belum lulus uji balik 0.9)."""
    asumsi = [_teks(t, "asumsi", maks=60) for t in asumsi]
    if any(not t.startswith("Asumsi: ") for t in asumsi):
        raise ValueError("teks asumsi harus diawali 'Asumsi: '")
    if not isinstance(id, str) or not ID.match(id):
        raise ValueError(f"id kartu {id!r} harus huruf kecil, angka, tanda hubung")
    if ikon not in IKON:
        raise ValueError(f"ikon {ikon!r} di luar daftar {IKON}")
    label = _label(label)
    judul = _teks(judul, "judul", maks=60)
    if "{" in judul or "}" in judul:
        raise ValueError("judul = nama seksi, tanpa {n} (AGENTS.md 3.5)")
    rumus = _teks(rumus, "rumus", wajib=bool(PERLU_RUMUS & set(label)))
    sumber = [_teks(s, "sumber") for s in (sumber or [])]
    if not sumber:
        raise ValueError("kartu tanpa sumber masukan")
    a = []
    for i, x in enumerate(angka or []):
        if not isinstance(x, dict) or set(x) - {"k", "label", "nilai", "title", "desimal"} or not KUNCI.match(str(x.get("k", ""))):
            raise ValueError(f"angka[{i}] harus {{k, label, nilai, title?, desimal?}}: {x!r}")
        a.append({"k": x["k"], "label": _teks(x.get("label"), f"angka {x['k']} label", maks=80),
                  "nilai": _angka(x.get("nilai"), f"angka {x['k']}"),
                  **({"title": _teks(x["title"], "title")} if x.get("title") else {}), **_desimal(x)})
    if len({x["k"] for x in a}) != len(a):
        raise ValueError("kunci angka kembar")
    ko, kunci_angka = [], set()
    for i, c in enumerate(kolom or []):
        if not isinstance(c, dict) or set(c) - {"k", "label", "title", "angka", "desimal", "tautan"} or not KUNCI.match(str(c.get("k", ""))):
            raise ValueError(f"kolom[{i}] harus {{k, label, title?, angka?, desimal?, tautan?}}: {c!r}")
        if "desimal" in c and not c.get("angka"):
            raise ValueError(f"kolom {c['k']}: desimal hanya untuk kolom angka")
        if "tautan" in c and (c.get("angka") or not KUNCI.match(str(c["tautan"]))):
            raise ValueError(f"kolom {c['k']}: tautan = kunci baris berisi jalur, hanya untuk kolom teks")
        ko.append({"k": c["k"], "label": _teks(c.get("label"), f"kolom {c['k']}", maks=60),
                   **({"title": _teks(c["title"], "title")} if c.get("title") else {}),
                   **({"angka": True} if c.get("angka") else {}), **_desimal(c),
                   **({"tautan": c["tautan"]} if c.get("tautan") else {})})
        if c.get("angka"):
            kunci_angka.add(c["k"])
    nama_kolom = [c["k"] for c in ko]
    kunci_jalur = {c["tautan"] for c in ko if c.get("tautan")}
    if len(set(nama_kolom)) != len(nama_kolom) or kunci_jalur & set(nama_kolom):
        raise ValueError("kunci kolom kembar")
    if baris and not ko:
        raise ValueError("baris tanpa kolom")
    ba = []
    for i, b in enumerate(baris or []):
        if not isinstance(b, dict) or set(b) - set(nama_kolom) - kunci_jalur:
            raise ValueError(f"baris[{i}] memuat kunci di luar kolom: {sorted(set(b) - set(nama_kolom) - kunci_jalur) if isinstance(b, dict) else b!r}")
        ba.append({k: (_angka(v, f"baris[{i}].{k}") if k in kunci_angka else None if v is None
                       else _jalur(v, f"baris[{i}].{k}") if k in kunci_jalur else _teks(str(v), f"baris[{i}].{k}"))
                   for k, v in b.items()})
    ta = []
    for i, t in enumerate(tautan or []):
        if not isinstance(t, (list, tuple)) or len(t) != 2:
            raise ValueError(f"tautan[{i}] harus [jalur, teks]")
        ta.append([_jalur(t[0], f"tautan[{i}]"), _teks(t[1], f"tautan[{i}] teks", maks=40)])
    if unduh is not None and (not isinstance(unduh, str) or not UNDUH.fullmatch(unduh) or not ko):
        raise ValueError(f"unduh {unduh!r} harus nama .csv huruf kecil dan kartu bertabel")
    return {"id": id, "sistem": _teks(sistem, "sistem", wajib=False, maks=20), "pil": _teks(pil, "pil", maks=40), "ikon": ikon,
            "judul": judul, "angka": a, "kolom": ko, "baris": ba, "rumus": rumus, "aturan": [_pasal(k) for k in aturan],
            "label": label, "sumber": sumber, **({"asumsi": asumsi} if asumsi else {}),
            **({"tautan": ta} if ta else {}), **({"unduh": unduh} if unduh else {})}


def _atribusi(sumber):
    if not isinstance(sumber, list) or not sumber:
        raise ValueError("berkas tanpa atribusi sumber [{nama, url, diambil, lisensi}]")
    out = []
    for i, s in enumerate(sumber):
        if not isinstance(s, dict) or set(s) != {"nama", "url", "diambil", "lisensi"}:
            raise ValueError(f"sumber[{i}] harus tepat {{nama, url, diambil, lisensi}}: {s!r}")
        if not re.match(r"^(https://\S+|repo:\S+)$", str(s["url"])):
            raise ValueError(f"sumber[{i}].url harus https:// atau repo:<berkas>")
        if not re.match(r"^\d{4}-\d{2}-\d{2}", str(s["diambil"])):
            raise ValueError(f"sumber[{i}].diambil bukan tanggal ISO")
        out.append({"nama": _teks(s["nama"], "nama"), "url": s["url"], "diambil": s["diambil"], "lisensi": _teks(s["lisensi"], "lisensi")})
    return out


def berkas(kartu_, sumber):
    if not kartu_:
        raise ValueError("berkas tanpa kartu")
    ids = [k["id"] for k in kartu_]
    if len(set(ids)) != len(ids):
        raise ValueError("id kartu kembar di satu berkas")
    label = list(dict.fromkeys(x for k in kartu_ for x in k["label"]))
    return {"label": label, "sumber": _atribusi(sumber), "kartu": kartu_}


def periksa_berkas(d):
    """Bangun ulang tiap kartu lewat kartu(): skema salah (label hilang, kunci liar, angka berupa teks) ditolak."""
    if not isinstance(d, dict) or set(d) - {"dibuat", "basi_jam", "label", "sumber", "kartu", "data"}:
        raise ValueError("kunci berkas di luar {dibuat, basi_jam, label, sumber, kartu, data}")  # data: DT sec 5
    if d.get("basi_jam") not in BASI:
        raise ValueError(f"basi_jam {d.get('basi_jam')!r} di luar {BASI}")
    if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", str(d.get("dibuat"))):
        raise ValueError("dibuat bukan cap waktu UTC")
    ulang = []
    for k in d.get("kartu") or []:
        k2 = dict(k)
        k2["aturan"] = [p["kunci"] for p in k.get("aturan", [])]
        ulang.append(kartu(**k2))
    b = berkas(ulang, d.get("sumber"))
    if b["kartu"] != d["kartu"] or b["label"] != d.get("label"):
        raise ValueError("berkas tidak sama dengan bentuk baku kartu()")
    return d


def rata(nilai):
    ada = [_angka(x, "nilai") for x in nilai if x is not None]
    return sum(ada) / len(ada) if ada else None


def _tolak(f, *a, **kw):
    try:
        f(*a, **kw)
    except (ValueError, KeyError, TypeError):
        return
    raise AssertionError(f"masukan salah tidak ditolak: {a!r} {kw!r}")


def cek():
    dasar = dict(id="plp1-stok", pil="Logistik", judul="Stok penyangga 72 jam", ikon="gudang", sistem="PLP-1",
                 angka=[{"k": "belum", "label": "Kab/kota tanpa data stok", "nilai": 514}],
                 kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "beras_kg", "label": "Beras (kg)", "title": "JP x PR x 3 hari x 0,4 kg", "angka": True}],
                 baris=[{"kab": "Purbalingga", "beras_kg": 12693}, {"kab": "Banyumas", "beras_kg": None}],
                 rumus="paket_pangan = JP x PR x H", sumber=["terpapar"], label="hitungan_kita",
                 aturan=["stok_pr_umum", "std_beras_kg"])
    k = kartu(**dasar)
    assert k["label"] == ["hitungan_kita"] and k["baris"][1]["beras_kg"] is None, k
    assert k["aturan"][0]["letak"] == "Pasal 12 ayat (2)" and k["aturan"][1]["acuan"] == "perka-7-2008", k["aturan"]
    # label: tanpa, kosong, di luar daftar, "hitungan" versi DS (bukan kunci P-7) ditolak
    for lab in (None, [], "", "asumsi", "hitungan", ["resmi", "tebakan"]):
        _tolak(kartu, **{**dasar, "label": lab})
    assert kartu(**{**dasar, "label": ["proksi", "hitungan_kita", "proksi"]})["label"] == ["proksi", "hitungan_kita"]
    # hitungan dan proksi wajib rumus; resmi boleh tanpa
    _tolak(kartu, **{**dasar, "rumus": None})
    assert kartu(**{**dasar, "label": "resmi", "rumus": None})["rumus"] is None
    # kepala = nama seksi: tanpa {n}, tanpa kalimat panjang, tanpa titik tengah, tanpa "aman"
    for j in ("{n} kab/kota belum punya data stok", "x" * 61, "Stok \u00b7 72 jam", "Wilayah aman", ""):
        _tolak(kartu, **{**dasar, "judul": j})
    # angka: teks, bool, NaN ditolak; None tetap None (bukan 0)
    for v in ("514", True, float("nan"), float("inf")):
        _tolak(kartu, **{**dasar, "angka": [{"k": "belum", "label": "x", "nilai": v}]})
        _tolak(kartu, **{**dasar, "baris": [{"kab": "A", "beras_kg": v}]})
    assert kartu(**{**dasar, "angka": [{"k": "n", "label": "x", "nilai": None}]})["angka"][0]["nilai"] is None
    # asumsi tanpa kunci Jam Aturan: berawalan "Asumsi: ", kosong tidak muncul di kartu
    assert kartu(**{**dasar, "asumsi": ["Asumsi: belum lulus uji balik"]})["asumsi"] == ["Asumsi: belum lulus uji balik"]
    assert "asumsi" not in k
    _tolak(kartu, **{**dasar, "asumsi": ["belum lulus uji balik"]})
    _tolak(kartu, **{**dasar, "asumsi": ["Asumsi: " + "x" * 60]})
    # desimal: bulat 0-6, hanya kolom angka
    assert kartu(**{**dasar, "angka": [{"k": "n", "label": "x", "nilai": 0.0003, "desimal": 4}]})["angka"][0]["desimal"] == 4
    for d in (-1, 7, 2.5, True, "2"):
        _tolak(kartu, **{**dasar, "angka": [{"k": "n", "label": "x", "nilai": 1, "desimal": d}]})
    _tolak(kartu, **{**dasar, "kolom": [{"k": "kab", "label": "Kab/kota", "desimal": 2}, dasar["kolom"][1]]})
    # kunci liar, kolom kembar, aturan tak dikenal, ikon tak dikenal, id jelek, tanpa sumber
    _tolak(kartu, **{**dasar, "baris": [{"kab": "A", "nama_pic": "x"}]})
    _tolak(kartu, **{**dasar, "kolom": dasar["kolom"] + [{"k": "kab", "label": "Lagi"}]})
    _tolak(kartu, **{**dasar, "aturan": ["tidak_ada"]})
    _tolak(kartu, **{**dasar, "ikon": "roket"})
    _tolak(kartu, **{**dasar, "id": "PLP 1"})
    _tolak(kartu, **{**dasar, "sumber": []})
    # tautan dan unduh: hanya jalur situs sendiri; kolom tautan menunjuk kunci baris berisi jalur
    t = kartu(**{**dasar, "tautan": [["/bnpb/hukum", "Buka pustaka hukum"]], "unduh": "status_peraturan.csv",
                 "kolom": [{"k": "kab", "label": "Kab/kota", "tautan": "kab_url"}, dasar["kolom"][1]],
                 "baris": [{"kab": "A", "kab_url": "/bnpb/hukum#d=perka-1-2012", "beras_kg": 1}]})
    assert t["tautan"] == [["/bnpb/hukum", "Buka pustaka hukum"]] and t["unduh"] == "status_peraturan.csv" and t["baris"][0]["kab_url"].startswith("/bnpb/")
    assert "tautan" not in k and "unduh" not in k
    for j in ("https://contoh.id", "//contoh.id", "javascript:alert(1)", "/a b", "/a\n", "/a\"x"):
        _tolak(kartu, **{**dasar, "tautan": [[j, "x"]]})
        _tolak(kartu, **{**dasar, "kolom": [{"k": "kab", "label": "K", "tautan": "u"}], "baris": [{"kab": "A", "u": j}]})
    for u in ("a.xlsx", "../a.csv", "A.csv", "a.csv\n"):
        _tolak(kartu, **{**dasar, "unduh": u})
    _tolak(kartu, **{**dasar, "kolom": [{"k": "kab", "label": "K", "tautan": "kab"}]})
    # rata-rata: kosong tidak ikut, semua kosong -> None
    assert rata([2, None, 4]) == 3 and rata([None, None]) is None and rata([]) is None and rata([0, None]) == 0
    # berkas: atribusi wajib lengkap
    s = [{"nama": "Portal Satu Data BNPB", "url": "https://data.bnpb.go.id/", "diambil": "2026-11-26T01:00:00Z", "lisensi": "tidak tertulis"}]
    b = berkas([k], s)
    assert b["label"] == ["hitungan_kita"] and b["sumber"] == s
    _tolak(berkas, [k], [])
    _tolak(berkas, [k], [{"nama": "x", "url": "http://a", "diambil": "2026-11-26", "lisensi": "x"}])
    _tolak(berkas, [k], [{"nama": "x", "url": "https://a", "diambil": "2026-11-26"}])
    _tolak(berkas, [k, k], s)
    # fixture R2 yang dipakai uji layar harus lolos skema persis
    with open(CONTOH, encoding="utf-8") as f:
        c = json.load(f)
    periksa_berkas(c)
    rusak = json.loads(json.dumps(c))
    del rusak["kartu"][0]["label"]
    _tolak(periksa_berkas, rusak)
    rusak = json.loads(json.dumps(c))
    rusak["kartu"][0]["label"] = ["tebakan"]
    _tolak(periksa_berkas, rusak)
    rusak = json.loads(json.dumps(c))
    rusak["basi_jam"] = 12
    _tolak(periksa_berkas, rusak)
    print("rapor.py --cek: lulus")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
