"""Hujan harian riwayat per sel 0,5 derajat (Open-Meteo Archive, ERA5) -> data/raw/longsor/hujan.json (tidak di-commit).

Dasar P95 hujan 7 hari dan uji balik (hujan 'teramati' yang sama jenisnya dengan hujan nowcast). Lab/lokal, sekali lalu
bertahap: kuota gratis Open-Meteo (5.000 bobot/jam, 10.000/hari; satu lokasi x 3.200 hari ~ bobot 23) membuat 948 sel butuh
beberapa jam. BERLANJUT: sel yang sudah ada dilewati; KuotaHabis menghentikan jalan dengan rapi (jalankan lagi nanti).
Urutan sel: kabupaten dengan kejadian DIBI terbanyak dulu (kejadian.json), sisanya menyusul.

Isi berkas: {"mulai": "2017-01-01", "sampai": "...", "sel": {"lat,lon": [mm*10 bulat per hari, None -> -1]}}
Pakai:  python3 scripts/longsor/hujan_riwayat.py [maks_sel]   |   python3 scripts/longsor/hujan_riwayat.py uji
"""
import datetime as dt, json, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, MENTAH, KuotaHabis, UA, ambil, daftar_kec, kunci_sel, sel_hujan

URL = "https://archive-api.open-meteo.com/v1/archive"
MULAI = dt.date(2017, 1, 1)
BATCH = 5      # lokasi per panggilan
JEDA = 6       # detik antar panggilan (sopan; bobot per jam tetap yang membatasi)
BERKAS = os.path.join(MENTAH, "hujan.json")


def urut_sel(kecs, kej):
    """Sel terurut: jumlah kejadian DIBI kabupaten pemuatnya (menurun), lalu kunci."""
    n = {}
    for r in kej["dibi"]:
        n[kej["kab"][r[1]]] = n.get(kej["kab"][r[1]], 0) + r[2]
    bobot = {}
    for k in kecs:
        s = sel_hujan(k["lat"], k["lon"])
        bobot[s] = max(bobot.get(s, 0), n.get(f'{k["prov"]}|{k["kab"]}', 0))
    return sorted(bobot, key=lambda s: (-bobot[s], s))


def ke_int(xs):
    return [-1 if v is None else int(round(v * 10)) for v in xs]


def jalan(maks=10 ** 9):
    kej = json.load(open(os.path.join(KELUAR, "kejadian.json")))
    sel = urut_sel(daftar_kec(), kej)
    os.makedirs(MENTAH, exist_ok=True)
    simpan_ = json.load(open(BERKAS)) if os.path.exists(BERKAS) else {"mulai": MULAI.isoformat(), "sel": {}}
    akhir = dt.date.today() - dt.timedelta(days=6)   # arsip ERA5 tertinggal ~5 hari
    n_hari = (akhir - MULAI).days + 1
    sisa = [s for s in sel if kunci_sel(*s) not in simpan_["sel"]][:maks]
    print(f"hujan riwayat: {len(sisa)} sel belum ada dari {len(sel)}", file=sys.stderr)
    for i in range(0, len(sisa), BATCH):
        b = sisa[i:i + BATCH]
        q = {"latitude": ",".join(f"{a:.2f}" for a, _ in b), "longitude": ",".join(f"{o:.2f}" for _, o in b), "daily": "precipitation_sum",
             "start_date": MULAI.isoformat(), "end_date": akhir.isoformat(), "timezone": "Asia/Jakarta"}
        try:
            res = ambil(URL + "?" + urllib.parse.urlencode(q), kepala=UA, batas_waktu=120)
        except KuotaHabis as e:
            print(f"kuota habis, berhenti: {str(e)[:120]}", file=sys.stderr)
            break
        res = res if isinstance(res, list) else [res]
        for s, x in zip(b, res):
            h = ke_int(x["daily"]["precipitation_sum"])
            assert len(h) == n_hari, f"{s}: {len(h)} hari, harus {n_hari}"
            simpan_["sel"][kunci_sel(*s)] = h
        simpan_["sampai"] = akhir.isoformat()
        json.dump(simpan_, open(BERKAS, "w"), separators=(",", ":"))
        print(f"  {len(simpan_['sel'])}/{len(sel)} sel", file=sys.stderr)
        time.sleep(JEDA)


def uji():
    assert ke_int([1.26, None, 0]) == [13, -1, 0]
    kej = {"kab": ["a|X", "a|Y"], "dibi": [["2020-01-01", 1, 9, 0], ["2020-01-02", 0, 1, 0]]}
    kecs = [{"prov": "a", "kab": "X", "lat": -6.9, "lon": 107.6}, {"prov": "a", "kab": "Y", "lat": 1.1, "lon": 100.1}]
    assert urut_sel(kecs, kej) == [(1.25, 100.25), (-6.75, 107.75)]
    print("hujan_riwayat: uji lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan(int(sys.argv[1]) if sys.argv[1:] else 10 ** 9)
