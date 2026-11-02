"""Daerah senyap harian: kab/kota dengan sinyal bahaya kuat tetapi TANPA laporan -> public/data/senyap.json

Sinyal (semua sudah ada di repo):
  karhutla : titik panas unik 3 hari terakhir per kab (public/data/titik_hari, via belum_lapor.muat_titik). Ambang kecil sengaja
             (>= AMBANG_TITIK) supaya Jawa/Papua yang lapornya hanya 1-5% hari-titik ikut muncul; belum_lapor.py (>= 30 titik/7 hari) tetap
             daftar Kalimantan/Sumatera besar.
  banjir / longsor : level Siaga+ (>= 2) hari ini atau besok di public/banjir/data/status.json (max kecamatan dalam kab).
             Dipakai hanya bila status.json tidak lebih tua dari BASI_HARI hari terhadap hari sinyal.
Laporan  : episode kab di public/data/laphar_riwayat.json (Laporan Harian Pusdalops) jenis yang sama, yang berakhir >= awal sinyal - RENGGANG.
BATASAN  : laporan WARGA/BPBD yang baru masuk D1 tidak terjangkau dari pipeline GitHub Actions; "tanpa laporan" = tanpa laporan di Laphar
           Pusdalops (terbit lag 1-2 hari). Layar staf boleh menyaring lagi terhadap D1. Himawari (tanpa kab) dan BMKG nowcast (nama kecamatan
           teks) belum dipakai. Hujan per kab harian tidak ada selain status.json.
Konteks  : "N dari M tahun" = logbook_riwayat.json kab.tahun_ada[jenis][bulan sinyal], M = len(tahun_penuh) data (bukan angka tetap).
Pakai: python3 scripts/data/senyap.py      python3 scripts/data/senyap.py uji
"""
import collections, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR  # noqa: E402
import belum_lapor as BL  # noqa: E402

AMBANG_TITIK, KUAT_TITIK, JENDELA, RENGGANG, BASI_HARI, LEVEL_MIN = 10, 50, 3, 2, 3, 2
STATUS = os.path.join(AKAR, "public/banjir/data/status.json")
LAPHAR = os.path.join(AKAR, "public/data/laphar_riwayat.json")
RIWAYAT = os.path.join(AKAR, "public/data/logbook_riwayat.json")
KELUAR = os.path.join(AKAR, "public/data/senyap.json")
D = dt.date.fromisoformat
LABEL = {"karhutla": "Titik panas", "banjir": "Banjir", "longsor": "Longsor"}


def laporan_terakhir(episode):
    """{(jenis, 'prov|kab'): [(mulai, terakhir)]} hanya episode tingkat kab."""
    o = collections.defaultdict(list)
    for e in episode:
        if e.get("tingkat") == "kab":
            o[(e["jenis"], e["kab"])].append((D(e["mulai"]), D(e["terakhir"])))
    return o


def tanpa_laporan(lap, jenis, kab, awal):
    return not any(b >= awal - dt.timedelta(days=RENGGANG) for _, b in lap.get((jenis, kab), []))


def sinyal_karhutla(titik, akhir):
    """titik {(prov, kabnorm): {hari: n}} -> [(prov, kabnorm, n3, n7, sejak)] bila n3 >= AMBANG_TITIK."""
    a3 = akhir - dt.timedelta(days=JENDELA - 1)
    out = []
    for k, h in titik.items():
        n3 = sum(n for d, n in h.items() if a3 <= D(d) <= akhir)
        if n3 >= AMBANG_TITIK:
            ada = sorted(d for d, n in h.items() if a3 <= D(d) and n)
            out.append((k, n3, sum(h.values()), ada[0]))
    return out


def sinyal_status(status):
    """status.json -> {(jenis, 'prov|kab'): (level maks, hari pertama level >= LEVEL_MIN, n kec)} untuk hari ke-0 dan ke-1."""
    hari, o = status["hari"], {}
    for kk, v in status["kec"].items():
        kab = "|".join(kk.split("|")[:2])
        for jenis, arr in (("banjir", v["b"]), ("longsor", v["l"])):
            idx = [i for i in range(min(2, len(arr))) if arr[i] >= LEVEL_MIN]
            if not idx:
                continue
            lv, sejak, n = o.get((jenis, kab), (0, hari[idx[0]], 0))
            o[(jenis, kab)] = (max(lv, max(arr[:2])), min(sejak, hari[idx[0]]), n + 1)
    return o


def konteks(riwayat, kab, jenis, bulan):
    r = riwayat["kab"].get(kab)
    p = len(riwayat["tahun_penuh"])
    if not r or jenis not in r["tahun_ada"]:
        return {"tahun_ada": 0, "dari": p}
    return {"tahun_ada": r["tahun_ada"][jenis][bulan - 1], "dari": p}


def main():
    titik, nama, akhir = BL.muat_titik()
    lap = laporan_terakhir(json.load(open(LAPHAR))["episode"])
    ri = json.load(open(RIWAYAT))
    laphar_sampai = json.load(open(LAPHAR))["cakupan"]["sampai"]
    bulan = akhir.month
    rows = []
    for (pr, kn), n3, n7, sejak in sinyal_karhutla(titik, akhir):
        kab = f"{pr}|{nama[(pr, kn)]}"
        if not tanpa_laporan(lap, "karhutla", kab, D(sejak)):
            continue
        kuat = n3 >= KUAT_TITIK
        rows.append({"kab": kab, "jenis": "karhutla", "kekuatan": "kuat" if kuat else "sedang", "nilai": n3, "satuan": "titik 3 hari",
                     "sejak": sejak, "alasan": f"{n3} titik panas dalam {JENDELA} hari ({n7} dalam 7 hari), belum ada laporan karhutla di kab ini.",
                     "riwayat": konteks(ri, kab, "karhutla", bulan)})
    st = json.load(open(STATUS))
    pakai = (akhir - D(st["hari"][0])).days <= BASI_HARI
    if pakai:
        for (jenis, kab), (lv, sejak, nkec) in sinyal_status(st).items():
            if not tanpa_laporan(lap, jenis, kab, D(sejak)):
                continue
            rows.append({"kab": kab, "jenis": jenis, "kekuatan": "kuat" if lv >= 3 else "sedang", "nilai": nkec, "satuan": "kecamatan Siaga+",
                         "sejak": sejak, "alasan": f"Prakiraan {LABEL[jenis].lower()} level {'Awas' if lv >= 3 else 'Siaga'} di {nkec} kecamatan, belum ada laporan.",
                         "riwayat": konteks(ri, kab, jenis, bulan)})
    rows.sort(key=lambda r: (r["kekuatan"] != "kuat", -r["nilai"], r["kab"]))
    tp = ", ".join(ri["tahun_penuh"])
    keluar = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "acuan": akhir.isoformat(),
              "sumber": {"titik_hari": f"sampai {akhir}", "status_banjir": {"hari0": st["hari"][0], "dipakai": pakai},
                         "laphar_sampai": laphar_sampai},
              "batasan": "Tanpa laporan = tanpa episode kab di Laporan Harian Pusdalops (lag 1-2 hari) sejak sinyal dikurangi "
                         f"{RENGGANG} hari. Laporan warga/BPBD di D1 tidak terjangkau dari pipeline; layar staf boleh menyaring lagi. "
                         "Himawari dan BMKG nowcast belum dipakai. Daftar tanya, bukan vonis.",
              "ambang": {"titik_3h": AMBANG_TITIK, "titik_3h_kuat": KUAT_TITIK, "level_min": LEVEL_MIN},
              "riwayat_ket": f"riwayat.tahun_ada dari riwayat.dari = berapa tahun penuh ({tp}) kab itu punya kejadian jenis ini di bulan sinyal",
              "baris": rows}
    json.dump(keluar, open(KELUAR + ".tmp", "w"), ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    c = collections.Counter(r["jenis"] for r in rows)
    print(f"{len(rows)} kab senyap {dict(c)} acuan {akhir} banjir_dipakai={pakai} -> {KELUAR}")
    for r in rows[:6]:
        print(r["kekuatan"], r["jenis"], r["kab"], r["nilai"], r["sejak"], r["riwayat"])


def uji():
    A = D("2026-10-20")
    seri = lambda n: {(A - dt.timedelta(days=i)).isoformat(): n for i in range(3)}
    titik = {("61", "a"): seri(20), ("61", "b"): seri(3), ("61", "c"): seri(20)}  # a: 60 kuat, b: 9 < ambang, c: ada laporan
    s = sinyal_karhutla(titik, A)
    assert sorted(x[0] for x in s) == [("61", "a"), ("61", "c")] and s[0][1] == 60
    lap = laporan_terakhir([{"jenis": "karhutla", "tingkat": "kab", "kab": "61|C", "mulai": "2026-10-19", "terakhir": "2026-10-19"},
                            {"jenis": "karhutla", "tingkat": "prov", "kab": "61", "mulai": "2026-10-19", "terakhir": "2026-10-19"}])
    assert tanpa_laporan(lap, "karhutla", "61|A", A) and not tanpa_laporan(lap, "karhutla", "61|C", A)
    assert tanpa_laporan(lap, "karhutla", "61|C", D("2026-10-25"))  # laporan lama sebelum sinyal baru
    st = {"hari": ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"],
          "kec": {"32|X|k1": {"b": [0, 2, 3, 0], "l": [1, 1, 0, 0]}, "32|X|k2": {"b": [3, 0, 0, 0], "l": [0, 0, 0, 0]},
                  "32|Y|k3": {"b": [0, 0, 3, 3], "l": [2, 2, 0, 0]}}}
    o = sinyal_status(st)
    assert o == {("banjir", "32|X"): (3, "2026-10-20", 2), ("longsor", "32|Y"): (2, "2026-10-20", 1)}, o
    ri = {"tahun_penuh": list("2014 2015 2016 2017 2018 2019 2020".split()), "kab": {"32|X": {"tahun_ada": {"banjir": [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 7]}}}}
    assert konteks(ri, "32|X", "banjir", 11) == {"tahun_ada": 5, "dari": 7} and konteks(ri, "99|Z", "banjir", 1) == {"tahun_ada": 0, "dari": 7}
    print("uji senyap: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
