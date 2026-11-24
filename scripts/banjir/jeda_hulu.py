"""Jeda hulu ke hilir (H32, docs/hidromet-jam/ALGORITMA.md A10): waktu tempuh Kirpich tiap sub-DAS `hulu.py` ke kecamatan keluaran DAS-nya.

Pakai:  python3 scripts/banjir/jeda_hulu.py        bangun public/banjir/data/jeda_hulu.json (tanpa jaringan)
        python3 scripts/banjir/jeda_hulu.py uji    self-check: rumus, penggeseran, lalu data repo sungguhan

Masukan (semua sudah di repo): public/banjir/data/bukti/<slug>.json `subdas` (titik tengah, luas, kecamatan; sama dengan yang dibaca hulu.py)
dan data/raw/banjir/faktor_kec/elevasi_topo.json (titik tinggi SRTM 90 m yang dipakai faktor_kec.py).

Kirpich: t_c = 0,0195 * L^0,77 * S^-0,385 menit, L meter, S = beda tinggi / L.
  L = jarak garis lurus titik tengah sub-DAS -> titik tengah sub-DAS keluaran (HydroBASINS tidak membawa panjang sungai di repo), dikali SINUOSITAS.
  Tinggi hulu = persentil 90 titik SRTM dalam jari-jari setara luas sub-DAS di sekitar titik tengahnya; tinggi hilir = persentil 10 di sekitar keluaran.
KEDUDUKAN: keterangan OPERASIONAL/deskriptif. PRAREG-HULU.md (beku) tidak memuat t_c: fiturnya hu1 (hari UTC e-2) dan hu3 (e-4..e-2) harian tetap.
Memasukkan t_c ke model butuh amandemen PRAREG baru; berkas ini TIDAK mengubah fitur atau vonis apa pun.
"""
import datetime as dt
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import KELUAR, MENTAH, WIB, baca, simpan  # noqa: E402

BUKTI = os.path.join(KELUAR, "bukti")
TOPO = os.path.join(MENTAH, "faktor_kec", "elevasi_topo.json")
JALUR = os.path.join(KELUAR, "jeda_hulu.json")
SINUOSITAS = 1.0  # kenop kalibrasi: sungai berkelok lebih panjang dari garis lurus; 1,0 = batas bawah t_c (belum dikalibrasi, tak ada panjang sungai di repo)
MIN_TITIK = 3
R_MIN_KM = 3.0  # titik SRTM di repo berjarak ~1-2 km; jari-jari lebih kecil tak memuat cukup titik
BATASAN = [
    "Kirpich dibuat untuk cekungan kecil (urutan puluhan hektare); sub-DAS di sini ratusan km2, jadi t_c adalah urutan besaran, bukan prakiraan debit.",
    "L adalah garis lurus titik tengah sub-DAS ke titik tengah sub-DAS keluaran dikali SINUOSITAS (1,0): batas bawah, bukan panjang sungai.",
    "Kemiringan dari titik SRTM 90 m (persentil 90 hulu, persentil 10 hilir): kasar, sensitif pada jari-jari dan sebaran titik.",
    "Cekungan berlereng landai (mis. dataran banjir) memberi S kecil dan t_c besar; kanal, waduk, dan pengalihan air tidak dihitung.",
    "Hanya deskriptif: PRAREG-HULU.md beku tidak memuat t_c; dipakai dalam model hanya lewat amandemen PRAREG baru.",
]


def km(la1, lo1, la2, lo2):
    r = math.pi / 180
    x = math.sin((la2 - la1) * r / 2) ** 2 + math.cos(la1 * r) * math.cos(la2 * r) * math.sin((lo2 - lo1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def kirpich(L_km, dh_m):
    """-> menit; None bila L atau beda tinggi tak positif"""
    if not (L_km > 0 and dh_m > 0):
        return None
    L = L_km * 1000
    return 0.0195 * L ** 0.77 * (dh_m / L) ** -0.385


def persentil(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p / 100 * len(v)))]


def muat_topo():
    """-> {(sel 0,1 derajat): [(lat, lon, m)]}; bukan dict besar per titik supaya cari-radius murah"""
    t = {}
    for k, m in json.load(open(TOPO)).items():
        if isinstance(m, (int, float)):
            la, lo = map(float, k.split(","))
            t.setdefault((int(la * 10) // 1, int(lo * 10) // 1), []).append((la, lo, m))
    return t


def tinggi_sekitar(topo, la, lo, r_km, p):
    """persentil p tinggi titik SRTM dalam r_km dari (la, lo) -> (m, n) atau (None, n)"""
    ring = int(r_km / 11) + 1
    c = (int(la * 10) // 1, int(lo * 10) // 1)
    v = [m for di in range(-ring, ring + 1) for dj in range(-ring, ring + 1)
         for (a, b, m) in topo.get((c[0] + di, c[1] + dj), ()) if km(la, lo, a, b) <= r_km]
    return (persentil(v, p) if len(v) >= MIN_TITIK else None), len(v)


def r_setara(km2):
    return max(R_MIN_KM, math.sqrt(km2 / math.pi))


def bangun_daerah(d, topo):
    keluar = next((s for s in d["subdas"] if s["keluaran"]), None)
    if not keluar:
        return None
    hil, n_hil = tinggi_sekitar(topo, keluar["lat"], keluar["lon"], r_setara(keluar["km2"]), 10)
    rows = []
    for s in sorted(d["subdas"], key=lambda s: -s["km2"]):
        o = {"id": s["id"], "kec": s["kec"], "kab": s["kab"], "km2": s["km2"], "keluaran": s["keluaran"],
             "L_km": None, "dh_m": None, "S": None, "tc_menit": None, "alasan": None}
        if s["keluaran"]:
            o["alasan"] = "sub-DAS keluaran: jarak ke dirinya sendiri nol"
        else:
            L = km(s["lat"], s["lon"], keluar["lat"], keluar["lon"]) * SINUOSITAS
            hu, n_hu = tinggi_sekitar(topo, s["lat"], s["lon"], r_setara(s["km2"]), 90)
            o["L_km"] = round(L, 1)
            if hu is None or hil is None:
                o["alasan"] = f"titik SRTM kurang (hulu {n_hu}, hilir {n_hil}, minimal {MIN_TITIK})"
            else:
                o["dh_m"] = round(hu - hil)
                tc = kirpich(L, hu - hil)
                if tc is None:
                    o["alasan"] = "beda tinggi hulu-hilir <= 0 (titik tengah tidak lebih tinggi dari keluaran)"
                else:
                    o["S"] = round((hu - hil) / (L * 1000), 5)
                    o["tc_menit"] = round(tc)
        rows.append(o)
    return {"kunci": d["kunci"], "slug": d["slug"], "kab": d["kab"], "keluaran_kec": keluar["kec"], "keluaran_kab": keluar["kab"], "subdas": rows}


def bangun(dibuat):
    topo = muat_topo()
    idx = json.load(open(os.path.join(BUKTI, "index.json")))
    out = []
    for e in idx["daerah"]:
        d = json.load(open(os.path.join(BUKTI, e["slug"] + ".json")))
        if d.get("subdas"):
            r = bangun_daerah(d, topo)
            if r:
                out.append(r)
    return {"versi": "jeda_hulu/1", "dibuat": dibuat, "sinuositas": SINUOSITAS, "rumus": "t_c = 0,0195 * L^0,77 * S^-0,385 menit (L meter)",
            "daerah": out, "batasan": BATASAN}


def geser(seri, tc_menit):
    """seri hujan per jam di hulu [(datetime, mm)] (GSMaP/IMERG; antarmuka saja, tak ada pengunduh di sini) -> [(jam_tiba, mm)] di hilir.
    jam_tiba = waktu hujan + t_c, tanpa pembulatan; t_c None -> []"""
    if tc_menit is None:
        return []
    d = dt.timedelta(minutes=tc_menit)
    return [(t + d, mm) for t, mm in seri]


def uji():
    # rumus: L = 1 km, S = 0,01 -> 0,0195 * 1000^0,77 * 0,01^-0,385
    esp = 0.0195 * 1000 ** 0.77 * 0.01 ** -0.385
    assert abs(kirpich(1, 10) - esp) < 1e-9 and 22 < esp < 25, esp
    assert kirpich(0, 10) is None and kirpich(1, 0) is None and kirpich(1, -5) is None
    assert kirpich(4, 40) > kirpich(2, 20), "L dua kali dengan S sama harus lebih lama"
    assert kirpich(1, 5) > kirpich(1, 50), "lebih landai harus lebih lama"
    t0 = dt.datetime(2026, 1, 1, 0, tzinfo=WIB)
    g = geser([(t0, 5.0), (t0 + dt.timedelta(hours=1), 2.0)], 90)
    assert g[0] == (t0 + dt.timedelta(minutes=90), 5.0) and g[1][0] == t0 + dt.timedelta(hours=2, minutes=30)
    assert geser([(t0, 1.0)], None) == []
    assert persentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90) == 10 and persentil([5], 10) == 5
    # data repo sungguhan
    H = bangun("uji")
    ok = [o for d in H["daerah"] for o in d["subdas"] if o["tc_menit"] is not None]
    semua = [o for d in H["daerah"] for o in d["subdas"] if not o["keluaran"]]
    assert H["daerah"] and semua, "tak ada daerah/sub-DAS dari bukti"
    assert ok, "tak satu sub-DAS pun punya t_c"
    for o in ok:
        assert math.isfinite(o["tc_menit"]) and o["tc_menit"] > 0 and o["L_km"] > 0 and o["dh_m"] > 0 and o["S"] > 0
    tc = sorted(o["tc_menit"] for o in ok)
    print(f"jeda_hulu uji: lulus; {len(H['daerah'])} daerah, {len(semua)} sub-DAS non-keluaran, t_c terhitung {len(ok)}, "
          f"tanpa t_c {len(semua) - len(ok)}; median {tc[len(tc) // 2]} mnt, min {tc[0]}, maks {tc[-1]}")
    for d in H["daerah"]:
        if d["slug"] == "32-bandung":
            for o in d["subdas"]:
                print(f"  {o['kec']:<12} {o['kab']:<14} km2={o['km2']:<6} L={o['L_km']} dh={o['dh_m']} t_c={o['tc_menit']} mnt {o['alasan'] or ''}")


def main():
    H = bangun(dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"))
    simpan(JALUR, H)
    print(f"jeda_hulu: {len(H['daerah'])} daerah -> {JALUR}", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:2] == ["uji"] else main()
