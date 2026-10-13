"""Cuaca per jam untuk peristiwa kebakaran (Open-Meteo archive, ERA5) + ENSO/IOD -> data/raw/sebaran/cuaca/, enso.json

Satuan pengambilan = (tahun, sel 0,5 derajat): rentang = deteksi pertama - 30 hari .. deteksi terakhir + 4 hari dari semua
peristiwa tumbuh (>= 3 sel, 9 provinsi prioritas, mulai Jul-Nov) di sel itu. 30 hari = masa panas FWI, sama dengan yang
dipakai di peramban (forecast past_days=30), jadi fitur latih dan fitur saat dipakai dihitung dengan cara yang sama.

Kuota (bobot = lokasi x max(1, var/10 x hari/14), pola scripts/data/tanah.py): 5 variabel; pasangan diurut menurut jumlah
peristiwa, berhenti di SEBARAN_KUOTA (bawaan 6500). Tiap pasangan satu berkas: jalan ulang tidak membayar dua kali.
Tempo: tidur bobot x 0,8 dtk (~4.500/jam, di bawah batas 5.000/jam).

ENSO: ONI (NOAA CPC oni.ascii.txt). IOD: DMI HadISST (NOAA PSL dmi.had.long.data). Disimpan sekali.

Pakai:  python3 scripts/sebaran/cuaca.py      |  python3 scripts/sebaran/cuaca.py uji
"""
import datetime as dt, importlib.util, json, math, os, sys, time, urllib.parse, urllib.request

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import MENTAH, PRIORITAS  # noqa: E402

_s = importlib.util.spec_from_file_location("banjir_umum", os.path.join(DIR, "..", "banjir", "umum.py"))
_b = importlib.util.module_from_spec(_s)
sys.path.insert(1, os.path.join(DIR, "..", "banjir"))
_s.loader.exec_module(_b)
ambil, KuotaHabis = _b.ambil, _b.KuotaHabis

URL = "https://archive-api.open-meteo.com/v1/archive"
VAR = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m", "wind_direction_10m"]
KOLOM = ["tc", "rh", "hujan", "ws", "wd"]
CUACA = os.path.join(MENTAH, "cuaca")
SPIN = 30
BULAN = ("07", "08", "09", "10", "11")


def sel05(lat, lon):
    return math.floor(lat / .5) * .5 + .25, math.floor(lon / .5) * .5 + .25


def nama(th, la, lo):
    return os.path.join(CUACA, f"{th}_{la:.2f}_{lo:.2f}.json")


def pakai(e):
    """Peristiwa yang ikut pemodelan berbasis cuaca."""
    return e["prov"] in PRIORITAS and e["sel"] >= 3 and e["t0"][5:7] in BULAN


def bobot(hari, n_var=len(VAR)):
    return max(1.0, n_var / 10 * hari / 14)


def pasangan(jalur=os.path.join(MENTAH, "peristiwa.jsonl")):
    rng, n = {}, {}
    for l in open(jalur):
        e = json.loads(l)
        if not pakai(e):
            continue
        k = (int(e["t0"][:4]), *sel05(e["lat0"], e["lon0"]))
        d0 = dt.date.fromisoformat(e["t0"][:10])
        d1 = (dt.datetime.fromisoformat(e["t0"]) + dt.timedelta(hours=e["jam"])).date()
        a, b = rng.get(k, (d0, d1))
        rng[k] = (min(a, d0), max(b, d1))
        n[k] = n.get(k, 0) + 1
    return sorted(((k, rng[k][0] - dt.timedelta(days=SPIN), rng[k][1] + dt.timedelta(days=4), n[k]) for k in rng), key=lambda x: -x[3])


def enso():
    j = os.path.join(MENTAH, "enso.json")
    if os.path.exists(j):
        return json.load(open(j))
    oni, dmi = {}, {}
    txt = urllib.request.urlopen(urllib.request.Request("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", headers={"User-Agent": "poskokarhutla/1.0"}), timeout=60).read().decode()
    musim = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]
    for ln in txt.splitlines()[1:]:
        p = ln.split()
        if len(p) == 4 and p[0] in musim:
            oni[f"{p[1]}-{musim.index(p[0]) + 1:02d}"] = float(p[3])  # musim tengah = bulan ke-(i+1)
    txt = urllib.request.urlopen(urllib.request.Request("https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data", headers={"User-Agent": "poskokarhutla/1.0"}), timeout=60).read().decode()
    for ln in txt.splitlines()[1:]:
        p = ln.split()
        if len(p) == 13 and p[0].isdigit():
            for b, v in enumerate(p[1:], 1):
                if float(v) > -99:
                    dmi[f"{p[0]}-{b:02d}"] = float(v)
    out = {"sumber": "ONI NOAA CPC (oni.ascii.txt, bulan = tengah musim 3 bulan); DMI NOAA PSL HadISST", "oni": oni, "dmi": dmi}
    json.dump(out, open(j, "w"))
    return out


def main():
    os.makedirs(CUACA, exist_ok=True)
    e = enso()
    print(f"ONI {len(e['oni'])} bulan, DMI {len(e['dmi'])} bulan", file=sys.stderr)
    batas_arsip = dt.date.today() - dt.timedelta(days=6)
    kuota = float(os.environ.get("SEBARAN_KUOTA", "6500"))
    daf = [x for x in pasangan()[:int(os.environ.get("SEBARAN_PASANGAN", "1500"))] if not os.path.exists(nama(*x[0]))]
    # kelompok <= 10 lokasi per panggilan: tahun sama, rentang mirip (urut tanggal mulai); rentang = gabungan
    daf.sort(key=lambda x: (x[0][0], x[1]))
    grup, pakai_b = [], 0.0
    for x in daf:
        if grup and grup[-1][0][0][0] == x[0][0] and len(grup[-1]) < 10 and abs((grup[-1][0][1] - x[1]).days) <= 20:
            grup[-1].append(x)
        else:
            grup.append([x])
    if os.environ.get("SEBARAN_BALIK"):  # proses kedua dari ujung lain daftar
        grup.reverse()
    for no, g in enumerate(grup):
        g = [x for x in g if not os.path.exists(nama(*x[0]))]
        if not g:
            continue
        a = min(x[1] for x in g)
        b = min(max(x[2] for x in g), batas_arsip)
        w = len(g) * bobot((b - a).days + 1)
        if pakai_b + w > kuota:
            print(f"kuota sesi {kuota} tercapai di grup {no}/{len(grup)}", file=sys.stderr)
            break
        q = {"latitude": ",".join(str(x[0][1]) for x in g), "longitude": ",".join(str(x[0][2]) for x in g), "hourly": ",".join(VAR),
             "start_date": a.isoformat(), "end_date": b.isoformat(), "timezone": "GMT", "wind_speed_unit": "kmh"}
        t_mulai = time.time()
        try:
            data = ambil(URL + "?" + urllib.parse.urlencode(q), batas_waktu=300)
        except KuotaHabis as e:
            print(f"kuota Open-Meteo habis ({e}); lanjutkan besok", file=sys.stderr)
            break
        for x, d in zip(g, data if isinstance(data, list) else [data]):
            h = d["hourly"]
            json.dump({"lat": x[0][1], "lon": x[0][2], "mulai": h["time"][0], **{k: h[v] for k, v in zip(KOLOM, VAR)}},
                      open(nama(*x[0]), "w"), separators=(",", ":"))
        pakai_b += w
        print(f"  grup {no + 1}/{len(grup)} bobot {pakai_b:.0f}", file=sys.stderr)
        time.sleep(max(0, w * .75 - (time.time() - t_mulai)))
    print(f"selesai, bobot sesi {pakai_b:.0f}; berkas {len(os.listdir(CUACA))}", file=sys.stderr)


def seri(th, lat, lon):
    """-> dict seri per jam (UTC) atau None. mulai = 'YYYY-MM-DDT00:00'."""
    f = nama(th, *sel05(lat, lon))
    return json.load(open(f)) if os.path.exists(f) else None


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert sel05(-2.21, 113.92) == (-2.25, 113.75)
        assert bobot(14) == 1.0 and abs(bobot(140) - 5.0) < 1e-9
        assert pakai({"prov": "62", "sel": 3, "t0": "2019-09-01T05:00"}) and not pakai({"prov": "62", "sel": 2, "t0": "2019-09-01T05:00"})
        assert not pakai({"prov": "11", "sel": 30, "t0": "2019-09-01T05:00"}) and not pakai({"prov": "62", "sel": 30, "t0": "2019-03-01T05:00"})
        print("ok")
    else:
        main()
