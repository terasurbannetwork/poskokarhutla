"""DIK-4 Bank tenaga pengajar dari direktori pakar (DESAIN-TEKNIS sec 6.30; ALGORITMA sec 10.43; tiket RU-106).

Langkah jalan.py (bulanan; keluaran unit/pengajar.json). Per mata pelatihan: 5 calon dari pencocok BM25 kemitraan
(scripts/kemitraan/cocok_pakar.py dan indeks_bm25.py, DIIMPOR, tidak disalin atau diubah; rumus di kampus/ALGORITMA.md).
Label: hitungan, "calon". Bukan penunjukan pengajar.

Masukan:
  scripts/bnpb/unit/mata_pelatihan.json  {"sumber": teks atau null, "diambil": tanggal atau null, "mata": [{"id", "nama", "uraian", "bahaya"}]}
      bahaya = salah satu KONST["BAHAYA"] kemitraan (menentukan indeks BM25). Daftar mata pelatihan Pusdiklat diketik pemilik dari dokumen
      yang dimiliki (e-Tangguh tidak terjangkau); isi kosong = keluaran "belum ada data", daftar tidak pernah dikarang.
  data/raw/unit/pakar/{induk.json, kampus.json, korpus/}  data direktori pakar (R2, staf; tidak di repo), format yang sama dengan
      indeks_bm25.py --induk --kampus --korpus. Tanpa itu keluaran "belum ada data".
  data/raw/unit/pakar/kecuali.json (opsional)  daftar id pakar yang dikecualikan tambahan.

Pengecualian direktori: kode repo ini TIDAK punya daftar id pengecualian (orang terkait kasus KPK, yang sudah meninggal, dan nama yang
disebut pemilik dibuang saat panen direktori, memori direktori-tanpa-kasus-kpk). Yang ada di kode dan dipakai ulang di sini hanya
indeks_bm25.siapkan_pakar (pakar bertanda "asing" dan tanpa karya tidak masuk). kecuali.json menambah id dari luar repo.
Keluaran hanya id profil, kode kampus, skor, h-index; tanpa nama orang.

  python3 -I scripts/bnpb/unit/dik4.py --cek
"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

AKAR = rapor.AKAR
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
import cocok_pakar as cp  # noqa: E402  (impor, tidak disalin)
import indeks_bm25 as ib  # noqa: E402
from konst import KONST  # noqa: E402

MATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mata_pelatihan.json")
PAKAR = os.path.join(AKAR, "data", "raw", "unit", "pakar")
N_CALON = 5
BELUM = "belum ada data"
RUMUS = "Skor = BM25 pencocok kemitraan antara deskripsi mata pelatihan dan karya pakar, 5 teratas, maksimum 2 per kampus"


def kecuali(jalur=PAKAR):
    p = os.path.join(jalur, "kecuali.json")
    return set(json.load(open(p, encoding="utf-8"))) if os.path.exists(p) else set()


def periksa_mata(d):
    if not isinstance(d, dict) or not isinstance(d.get("mata"), list):
        raise ValueError("mata_pelatihan.json harus {sumber, diambil, mata: [...]}")
    if d["mata"] and not d.get("sumber"):
        raise ValueError("daftar mata pelatihan terisi wajib menyebut sumber (tidak dikarang)")
    ids = set()
    for m in d["mata"]:
        if not isinstance(m, dict) or not all(isinstance(m.get(k), str) and m[k].strip() for k in ("id", "nama", "uraian")):
            raise ValueError(f"mata pelatihan harus punya id, nama, uraian teks: {m!r}")
        if m.get("bahaya") not in KONST["BAHAYA"]:
            raise ValueError(f"{m['id']}: bahaya {m.get('bahaya')!r} di luar {KONST['BAHAYA']}")
        if m["id"] in ids:
            raise ValueError(f"id mata pelatihan kembar: {m['id']}")
        ids.add(m["id"])
    return d


def calon(pakar, mata, buang=frozenset()):
    """pakar = hasil ib.siapkan_pakar. -> {id mata: [{id, kampus, skor, h}]}; pakar di `buang` tidak pernah jadi calon."""
    pakar = [p for p in pakar if p["id"] not in buang]
    ix, out = {}, {}
    for m in mata:
        b = m["bahaya"]
        if b not in ix:
            ix[b] = ib.bangun(pakar, b)
        q = cp.kueri(m["nama"], m["uraian"], b, None, None, None)
        top = cp.cocok(ix[b], q, None, None, None)[0] if ix[b]["N"] else []
        out[m["id"]] = [{"id": d["id"], "kampus": d["kampus"], "skor": round(d["skor"], 4), "h": d["h"]} for d in top[:N_CALON]]
    return out


PERINGATAN = "Asumsi: data pakar sudah disaring panen"


def bangun(mata, hasil, status, n_kecuali=0, peringatan=False):
    mata = mata or []
    baris = [{"mata": m["nama"], "peringkat": i + 1, "id_pakar": c["id"], "kampus": c["kampus"], "skor": c["skor"], "h": c["h"]}
             for m in mata for i, c in enumerate((hasil or {}).get(m["id"], []))]
    ada = bool(mata) and hasil is not None
    k = rapor.kartu(
        id="dik4-pengajar", sistem="DIK-4", pil="Bank pengajar", ikon="toga", judul="Calon pengajar per mata pelatihan",
        angka=[{"k": "mata", "label": "Mata pelatihan dicocokkan", "nilai": len(mata) if ada else None},
               {"k": "calon", "label": "Calon pengajar", "nilai": len(baris) if ada else None},
               {"k": "kecuali", "label": "Id dikecualikan tambahan", "nilai": n_kecuali if ada else None}],
        kolom=[{"k": "mata", "label": "Mata pelatihan"}, {"k": "peringkat", "label": "Peringkat", "angka": True},
               {"k": "id_pakar", "label": "Id profil direktori", "title": "Buka profilnya di /direktori"}, {"k": "kampus", "label": "Kode kampus"},
               {"k": "skor", "label": "Skor", "angka": True, "desimal": 3, "title": "BM25 pencocok kemitraan, 0 sampai 1"},
               {"k": "h", "label": "h-index", "angka": True}],
        baris=baris, rumus=RUMUS, sumber=["mata_pelatihan", "direktori_pakar"], label=["hitungan_kita"],
        tautan=[["/direktori", "Buka direktori"]], asumsi=["Asumsi: calon, bukan penunjukan"] + ([PERINGATAN] if peringatan else []), unduh="calon_pengajar.csv")
    sumber = [{"nama": "Direktori pakar Centurisk97 dan daftar mata pelatihan Pusdiklat", "url": "repo:scripts/bnpb/unit/mata_pelatihan.json",
               "diambil": "2026-11-26", "lisensi": "internal staf"}]
    b = rapor.berkas([k], sumber)
    b["data"] = {"status": status, "bahan": None if ada else BELUM,
                 "peringatan": "kecuali.json tidak ada: data pakar harus sudah disaring panen (KPK, wafat, nama yang disebut pemilik)" if peringatan else None}
    return b


def _status(mata, pakar):
    if not mata["mata"]:
        return "belum ada data: daftar mata pelatihan Pusdiklat belum diserahkan pemilik"
    if pakar is None:
        return "belum ada data: direktori pakar (data/raw/unit/pakar) belum ditarik"
    return "dihitung"


def _muat_pakar(jalur=PAKAR):
    if not all(os.path.exists(os.path.join(jalur, f)) for f in ("induk.json", "kampus.json")) or not os.path.isdir(os.path.join(jalur, "korpus")):
        return None
    return ib.muat_semua(os.path.join(jalur, "induk.json"), os.path.join(jalur, "kampus.json"), os.path.join(jalur, "korpus"))


def jalan():
    mata = periksa_mata(json.load(open(MATA, encoding="utf-8")))
    pakar = _muat_pakar()
    st = _status(mata, pakar)
    buang = kecuali()
    hasil = calon(pakar, mata["mata"], buang) if st == "dihitung" else None
    ada_kecuali = os.path.exists(os.path.join(PAKAR, "kecuali.json"))
    return {"pengajar": bangun(mata["mata"], hasil, st, len(buang), peringatan=st == "dihitung" and not ada_kecuali)}


def cek():
    mata = periksa_mata(json.load(open(MATA, encoding="utf-8")))   # berkas repo sah (kosong sampai pemilik menyerahkan daftar)
    assert mata["mata"] == [] and _status(mata, None).startswith("belum ada data")
    b0 = bangun([], None, _status(mata, None))["kartu"][0]
    assert all(a["nilai"] is None for a in b0["angka"]) and b0["baris"] == [], "tanpa data: kosong, bukan 0"
    for jelek in ({"mata": [{"id": "a", "nama": "x", "uraian": "y", "bahaya": "banjir"}]},   # tanpa sumber
                  {"sumber": "s", "mata": [{"id": "a", "nama": "x", "uraian": "y", "bahaya": "ngawur"}]},
                  {"sumber": "s", "mata": [{"id": "a", "nama": "x", "uraian": "y", "bahaya": "banjir"}] * 2}):
        try:
            periksa_mata(jelek)
            raise AssertionError(f"mata pelatihan palsu lolos: {jelek}")
        except ValueError:
            pass
    # dunia sintetis kemitraan (nama fiktif): pencocok yang SAMA dipakai, id dalam `kecuali` dan pakar asing tidak pernah jadi calon
    kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
    prov = json.load(open(os.path.join(AKAR, "public", "data", "meta.json"), encoding="utf-8"))["provinsi"]
    orang, kamp, korp = cp.dunia()
    orang = [o + [None] * (15 - len(o)) + ["asing"] if o[0] == "A1005" else o for o in orang]
    pakar = ib.siapkan_pakar(orang, kamp, korp, None, ib.frasa_wilayah(kode, prov))
    assert "A1005" not in {p["id"] for p in pakar}, "pakar asing harus gugur di siapkan_pakar"
    ada = [{"id": "m1", "nama": "Pemetaan bahaya banjir", "uraian": "flood hazard map modeling Kalimantan", "bahaya": "banjir"}]
    h = calon(pakar, ada)["m1"]
    assert 1 <= len(h) <= N_CALON and [c["skor"] for c in h] == sorted((c["skor"] for c in h), reverse=True), h
    assert h[0]["id"] in ("A1001", "A1002") and "A1007" not in {c["id"] for c in h}, h   # pakar kimia tak relevan tidak masuk
    h2 = calon(pakar, ada, {"A1001"})["m1"]
    assert "A1001" not in {c["id"] for c in h2} and len(h2) >= 1, "id dikecualikan tidak boleh jadi calon"
    with tempfile.TemporaryDirectory() as d:   # kecuali.json dibaca dari folder pakar
        assert kecuali(d) == set()
        json.dump(["A1001"], open(os.path.join(d, "kecuali.json"), "w"))
        assert kecuali(d) == {"A1001"}
    b = bangun(ada, {"m1": h}, "dihitung", 0, peringatan=True)
    assert PERINGATAN in b["kartu"][0]["asumsi"] and b["data"]["peringatan"], "tanpa kecuali.json, hasil berperingatan"
    assert PERINGATAN not in bangun(ada, {"m1": h}, "dihitung", 1)["kartu"][0]["asumsi"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    s = json.dumps(b, ensure_ascii=False)
    assert "Pakar Uji" not in s and '"nama"' not in json.dumps(b["kartu"]), "nama orang tidak boleh masuk keluaran"
    assert b["kartu"][0]["angka"][1]["nilai"] == len(h)
    print(f"dik4.py --cek: lulus ({len(h)} calon dari dunia sintetis, pencocok kemitraan diimpor; asing dan id dikecualikan gugur; tanpa data = belum ada data)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
