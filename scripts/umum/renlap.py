#!/usr/bin/env python3
"""Mesin renlap lintas bencana (PB-13, DESAIN-TEKNIS 8.1). Penilai target per jenis `SKOR[bencana]`, bobot di
scripts/operasi/bobot_renlap.json bagian `per_bencana` (HIPOTESIS untuk jenis tanpa uji balik, KEPUTUSAN-PARITAS D6).
Karhutla tetap dinilai oleh scripts/operasi/renlap.py (`kandidat`); di sini hanya dibungkus. Keluaran KML/GPX/teks/PDF: renlap_keluaran.py.
Python stdlib saja. Usulan lokasi untuk dilihat, bukan perintah terbang.

  python3 -I scripts/umum/renlap.py uji
  python3 -I scripts/umum/renlap.py buat --masukan BERKAS.json --keluar DIR
masukan: {"bencana","tanggal","versi","base":[{id,nama,lat,lon}],"kandidat":[{lat,lon,tempat,fitur:{tingkat,baru,terdampak,fasilitas,belum_ditangani}}]}
  fitur 0..1 (atau null bila datanya tidak ada: tidak dihitung dan dicatat di alasan.tanpa_data, bukan dianggap 0).
Keluaran: renlap_<tanggal>_<versi>.json, .kml, .gpx.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(AKAR / "scripts/umum"))
import renlap_keluaran as K  # noqa: E402

BOBOT = AKAR / "scripts/operasi/bobot_renlap.json"
FITUR = ("tingkat", "baru", "terdampak", "fasilitas", "belum_ditangani")
_OP = None


def operasi():
    """scripts/operasi/renlap.py (geometri, pilih_cakupan, kandidat karhutla), dimuat dengan nama unik karena namanya sama dengan berkas ini."""
    global _OP
    if _OP is None:
        sp = importlib.util.spec_from_file_location("operasi_renlap", AKAR / "scripts/operasi/renlap.py")
        _OP = importlib.util.module_from_spec(sp)
        sys.modules["operasi_renlap"] = _OP
        sp.loader.exec_module(_OP)
    return _OP


def muat_bobot(jalur=BOBOT):
    return json.loads(Path(jalur).read_text(encoding="utf-8"))


def skor_generik(bencana, c, B):
    """sum(bobot[f] x fitur[f]) atas fitur yang ada. -> (skor, alasan). Fitur null/hilang masuk alasan.tanpa_data."""
    b = B["per_bencana"][bencana]["bobot"]
    ada = {f: c["fitur"][f] for f in FITUR if isinstance(c.get("fitur", {}).get(f), (int, float)) and not isinstance(c["fitur"][f], bool)}
    for f, v in ada.items():
        assert 0 <= v <= 1, (bencana, f, v)
    alasan = dict(ada, tanpa_data=[f for f in FITUR if f not in ada], hipotesis=True)
    return round(sum(b[f] * v for f, v in ada.items()), 2), alasan


def skor_karhutla(titik, temuan, B, **kw):
    """Karhutla tidak berubah: kandidat() milik operasi/renlap.py (titik panas, gambut, FFMC, permukiman)."""
    return operasi().kandidat(titik, temuan, B, **kw)


SKOR = {  # satu penilai per id di public/bencana.json; jenis tanpa uji balik = bobot sama rata berlabel HIPOTESIS
    "karhutla": skor_karhutla,
    **{i: (lambda c, B, _i=i: skor_generik(_i, c, B)) for i in
       ("banjir", "pesisir", "cuaca", "gempa", "udara", "gunungapi", "kekeringan")},
}


def susun(bencana, kandidat, base, B, patroli_maks=None, r_km=None):
    """Nilai kandidat jenis `bencana`, pilih per base menurut cakupan (pilih_cakupan karhutla), urut tetangga terdekat."""
    assert bencana in SKOR and bencana != "karhutla", "karhutla lewat scripts/operasi/renlap.py"
    O = operasi()
    nilai = []
    for c in kandidat:
        s, al = SKOR[bencana](c, B)
        if s >= B["ambang"]["skor_minimum"]:
            nilai.append(dict(c, skor=s, alasan=al, n=1))
    patroli_maks = patroli_maks or B["batas"]["patroli_maks"]
    r_km = r_km or B["ambang"]["radius_pandang_km"]
    milik = {b["id"]: [] for b in base}
    for c in nilai:
        milik[min(base, key=lambda b: O.jarak_nm(b["lat"], b["lon"], c["lat"], c["lon"]))["id"]].append(c)
    out = []
    for b in base:
        pilih, sisa = O.pilih_cakupan(milik[b["id"]], patroli_maks, r_km)
        rute = O.urut_tetangga((b["lat"], b["lon"]), pilih)
        out.append(dict(b, patroli=[dict(c, urut=i + 1) for i, c in enumerate(rute)], wb=[],
                        di_luar_rute={"sel": len(sisa), "titik": len(sisa)} if rute else None))
    return {"bencana": bencana, "status": "draf", "bobot_label": B["per_bencana"][bencana]["label"],
            "catatan": "USULAN lokasi untuk dilihat, bukan perintah terbang.", "base": out}


def buat(a):
    m = json.loads(Path(a.masukan).read_text(encoding="utf-8"))
    r = susun(m["bencana"], m["kandidat"], m["base"], muat_bobot())
    r.update(tanggal=m["tanggal"], versi=m.get("versi", "pagi"))
    k = Path(a.keluar)
    k.mkdir(parents=True, exist_ok=True)
    n = "renlap_%s_%s" % (r["tanggal"], r["versi"])
    (k / (n + ".json")).write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
    (k / (n + ".kml")).write_text(K.kml(r["base"], n), encoding="utf-8")
    (k / (n + ".gpx")).write_text(K.gpx(r["base"], n), encoding="utf-8")
    print("ditulis %s.{json,kml,gpx}; base: %s" % (k / n, ", ".join("%s p%d" % (b["id"], len(b["patroli"])) for b in r["base"])))


# SHA-256 teks karhutla dari kode SEBELUM ekstraksi (operasi/renlap.py teks(), 15 Nov 2026) atas masukan sintetis di bawah.
EMAS_TEKS = "3df952cd5d04837a00a5335696596653f965eb24e79c5784d61a00fae994fd1e"


def contoh_karhutla():
    c = {"lat": -0.2, "lon": 109.5, "skor": 5.5, "n": 3, "urut": 1, "tempat": "Desa A, Kec. B, Kab. C", "dms": "S 00° 12' 00\"  E 109° 30' 00\"",
         "rd": "R 095 D 13 Nm Fr VOR PNK", "udara": {"pm25_maks": 40, "kab": "Kubu Raya"},
         "terakhir": {"jam_wib": "02 Nov 07:00", "satelit": "NOAA-20"},
         "alasan": {"titik_baru": 2, "menahun_hari": 3, "gambut": True, "ffmc": 91.2, "permukiman_km": 1.5, "belum_ditangani": True, "clear_lalu_titik_baru": True}}
    w = {"lat": -0.4, "lon": 109.4, "skor": 3.0, "urut": 1, "tempat": None, "dms": "S 00° 24' 00\"  E 109° 24' 00\"", "rd": "R 180 D 22 Nm Fr VOR PNK",
         "udara": "tidak tersedia", "alasan": {"temuan": "fs", "oleh": "H-1", "lokasi_laporan": "Desa X", "luas_klaim_ha": 4}}
    return {"tanggal": "2026-11-02", "versi": "pagi", "sumber": {"titik_panas": "t", "ffmc": "f"},
            "base": [{"id": "PNK", "nama": "Supadio", "deklinasi_timur": 0.5, "radius_nm": 120, "patroli": [c], "wb": [w],
                      "di_luar_rute": {"sel": 2, "titik": 5}}]}


def uji():
    import hashlib
    B = muat_bobot()
    reg = [b["id"] for b in json.loads((AKAR / "public/bencana.json").read_text(encoding="utf-8"))["bencana"]]
    assert sorted(SKOR) == sorted(reg), (sorted(SKOR), sorted(reg))
    assert "HIPOTESIS" in B["_label"] and "HIPOTESIS" in B["per_bencana"]["_label"]
    for i in reg:  # tiap jenis: label HIPOTESIS; bobot sama rata atau menunjuk bagian bobot karhutla; semua fitur ada
        e = B["per_bencana"][i]
        assert "HIPOTESIS" in e["label"], i
        if i != "karhutla":
            assert set(e["bobot"]) == set(FITUR) and len(set(e["bobot"].values())) == 1, i
    for i in reg:
        if i == "karhutla":
            continue
        s, al = SKOR[i]({"fitur": {"tingkat": 1, "baru": 0.5, "terdampak": None}}, B)
        assert s == 1.5 and al["tanpa_data"] == ["terdampak", "fasilitas", "belum_ditangani"] and al["hipotesis"], (i, s, al)
        assert SKOR[i]({"fitur": {}}, B)[0] == 0  # tanpa data = 0 dan dicatat, bukan angka karangan
    try:
        SKOR["banjir"]({"fitur": {"tingkat": 2}}, B)
        raise SystemExit("fitur di luar 0..1 harus ditolak")
    except AssertionError:
        pass
    # karhutla: penilai = kandidat() asli
    from datetime import datetime, timedelta, timezone
    kini = datetime(2026, 11, 2, 12, tzinfo=timezone.utc)
    t = [{"lat": -0.205, "lon": 109.505, "t": kini - timedelta(hours=3), "sat": "N20", "wil": "61|a|b"}]
    assert len(SKOR["karhutla"](t, [], B)) == 1
    # susun jenis non-karhutla: stabil terhadap urutan masukan, tiap kandidat paling banyak sekali
    base = [{"id": "A", "nama": "Bandara A", "lat": 0.0, "lon": 100.0}, {"id": "B", "nama": "Bandara B", "lat": 0.0, "lon": 110.0}]
    kd = [{"lat": 0.1 * i, "lon": 100.0 + 0.05 * i, "tempat": "K%d" % i, "fitur": {"tingkat": i / 5, "baru": 1}} for i in range(1, 6)]
    kd.append({"lat": 0.2, "lon": 110.1, "tempat": "Z", "fitur": {"tingkat": 0, "baru": 1}})
    r1, r2 = susun("banjir", kd, base, B), susun("banjir", list(reversed(kd)), base, B)
    assert r1 == r2 and [c["tempat"] for c in r1["base"][1]["patroli"]] == ["Z"] and "HIPOTESIS" in r1["bobot_label"]
    assert sum(len(b["patroli"]) for b in r1["base"]) <= 6
    # keluaran karhutla byte-identik sebelum/sesudah ekstraksi (hash dari kode lama), dan operasi/renlap.teks sama dengan penulis bersama
    h = hashlib.sha256(K.teks(contoh_karhutla()).encode("utf-8")).hexdigest()
    assert h == EMAS_TEKS, h
    assert operasi().teks(contoh_karhutla()) == K.teks(contoh_karhutla())
    print("renlap (umum): lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("perintah", choices=["buat"])
        ap.add_argument("--masukan", required=True)
        ap.add_argument("--keluar", required=True)
        buat(ap.parse_args())
