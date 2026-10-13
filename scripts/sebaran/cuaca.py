"""Cuaca per jam untuk peristiwa kebakaran (Open-Meteo archive, ERA5) + ENSO/IOD -> data/raw/sebaran/cuaca/, enso.json

Satuan pengambilan = (tahun, sel 0,5 derajat): rentang = deteksi pertama - 30 hari .. deteksi terakhir + 4 hari dari semua
peristiwa tumbuh (>= 3 sel, 9 provinsi prioritas, mulai Jul-Nov) di sel itu. 30 hari = masa panas FWI, sama dengan yang
dipakai di peramban (forecast past_days=30), jadi fitur latih dan fitur saat dipakai dihitung dengan cara yang sama.

Kuota (bobot = lokasi x max(1, var/10) x max(1, hari/14)): 5 variabel; pasangan diurut menurut jumlah
peristiwa, berhenti di SEBARAN_KUOTA (bawaan 6500). Tiap pasangan satu berkas: jalan ulang tidak membayar dua kali.
Tempo: tidur bobot x 0,8 dtk (~4.500/jam, di bawah batas 5.000/jam); batas per jam -> tunggu 10 menit.

ENSO: ONI (NOAA CPC oni.ascii.txt). IOD: DMI HadISST (NOAA PSL dmi.had.long.data). Disimpan sekali.

Pakai:  python3 scripts/sebaran/cuaca.py  |  ... ekstra [blok]  (variabel tambahan, sampel)  |  ... uji
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
    """Bobot Open-Meteo per lokasi: max(1, var/10) x max(1, hari/14). (Terukur 13 Okt 2026: 5 variabel tetap dihitung 1,
    bukan 0,5; batas per jam 5.000 tercapai di ~2.300 menurut rumus var x hari/14 yang lama.)"""
    return max(1.0, n_var / 10) * max(1.0, hari / 14)


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
    # SEBARAN_TAHUN="2023:1000,2019:900": anggaran per tahun, pasangan terpadat dulu (validasi & tahun El Nino didahulukan)
    if os.environ.get("SEBARAN_TAHUN"):
        pilih = []
        for bag in os.environ["SEBARAN_TAHUN"].split(","):
            th, bud = int(bag.split(":")[0]), float(bag.split(":")[1])
            w = 0
            for x in pasangan():
                if x[0][0] != th or os.path.exists(nama(*x[0])):
                    continue
                ww = bobot((x[2] - x[1]).days + 1)
                if w + ww > bud:
                    break
                w += ww
                pilih.append(x)
        daf = pilih
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
            if "Hourly" in str(e):
                print("batas per jam; tunggu 10 menit", file=sys.stderr)
                time.sleep(600)
                continue  # grup ini terlewat; jalan ulang mengambilnya
            print(f"kuota Open-Meteo habis ({e}); lanjutkan besok", file=sys.stderr)
            break
        for x, d in zip(g, data if isinstance(data, list) else [data]):
            h = d["hourly"]
            json.dump({"lat": x[0][1], "lon": x[0][2], "mulai": h["time"][0], **{k: h[v] for k, v in zip(KOLOM, VAR)}},
                      open(nama(*x[0]), "w"), separators=(",", ":"))
        pakai_b += w
        print(f"  grup {no + 1}/{len(grup)} bobot {pakai_b:.0f}", file=sys.stderr)
        time.sleep(max(0, w * .8 - (time.time() - t_mulai)))
    print(f"selesai, bobot sesi {pakai_b:.0f}; berkas {len(os.listdir(CUACA))}", file=sys.stderr)


# ---------------- variabel tambahan (riset pendorong, sampel) ----------------
# ERA5 di arsip Open-Meteo TIDAK menyediakan CAPE maupun suhu/titik embun 850/700 hPa (diperiksa 13 Okt 2026: semua null),
# jadi indeks Haines tidak bisa dihitung untuk 2015-2026; tinggi lapisan batas dipakai sebagai proksi potensi kepulan.
EKSTRA = ["soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "boundary_layer_height", "cloud_cover", "shortwave_radiation"]
KOL_EKSTRA = ["sm0", "sm1", "blh", "awan", "radiasi"]
DIR_EKSTRA = os.path.join(MENTAH, "cuaca_ekstra")
BLOK0 = dt.date(2015, 1, 1)


def blok(tgl):
    """Blok 14 hari global (bobot Open-Meteo = 1 per lokasi) -> tanggal awal blok."""
    return BLOK0 + dt.timedelta(days=(tgl - BLOK0).days // 14 * 14)


def nama_ekstra(b, la, lo):
    return os.path.join(DIR_EKSTRA, f"{b.isoformat()}_{la:.2f}_{lo:.2f}.json")


def ekstra(kuota):
    """Ambil variabel tambahan untuk blok (sel 0,5, 14 hari) yang memuat deteksi pertama peristiwa terbanyak."""
    os.makedirs(DIR_EKSTRA, exist_ok=True)
    n = {}
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        if '"prov":"' not in l:
            continue
        e = json.loads(l)
        if e["prov"] not in PRIORITAS or e["t0"][5:7] not in BULAN:
            continue
        k = (blok(dt.date.fromisoformat(e["t0"][:10])), *sel05(e["lat0"], e["lon0"]))
        n[k] = n.get(k, 0) + 1
    daf = [k for k in sorted(n, key=lambda k: -n[k]) if not os.path.exists(nama_ekstra(*k))][:int(kuota)]
    print(f"ekstra: {len(daf)} blok, {sum(n[k] for k in daf)} peristiwa dari {sum(n.values())}", file=sys.stderr)
    per_b = {}
    for k in daf:
        per_b.setdefault(k[0], []).append(k)
    pakai_b = 0
    for b, ks in sorted(per_b.items()):
        for a in range(0, len(ks), 10):
            g = ks[a:a + 10]
            q = {"latitude": ",".join(str(x[1]) for x in g), "longitude": ",".join(str(x[2]) for x in g), "hourly": ",".join(EKSTRA),
                 "start_date": b.isoformat(), "end_date": (b + dt.timedelta(days=13)).isoformat(), "timezone": "GMT"}
            try:
                data = ambil(URL + "?" + urllib.parse.urlencode(q), batas_waktu=120)
            except KuotaHabis as x:
                print(f"kuota: {x}", file=sys.stderr)
                return
            for x, d in zip(g, data if isinstance(data, list) else [data]):
                h = d["hourly"]
                json.dump({"mulai": h["time"][0], **{c: h[v] for c, v in zip(KOL_EKSTRA, EKSTRA)}}, open(nama_ekstra(*x), "w"), separators=(",", ":"))
            pakai_b += len(g)
            time.sleep(len(g) * .8)
    print(f"ekstra selesai, bobot {pakai_b}", file=sys.stderr)


def seri_ekstra(tgl, lat, lon):
    f = nama_ekstra(blok(tgl), *sel05(lat, lon))
    return json.load(open(f)) if os.path.exists(f) else None


def seri(th, lat, lon):
    """-> dict seri per jam (UTC) atau None. mulai = 'YYYY-MM-DDT00:00'."""
    f = nama(th, *sel05(lat, lon))
    return json.load(open(f)) if os.path.exists(f) else None


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert sel05(-2.21, 113.92) == (-2.25, 113.75)
        assert blok(dt.date(2015, 1, 14)) == dt.date(2015, 1, 1) and blok(dt.date(2015, 1, 15)) == dt.date(2015, 1, 15)
        assert bobot(14) == 1.0 and abs(bobot(140) - 10.0) < 1e-9 and bobot(140, 20) == 20.0
        assert pakai({"prov": "62", "sel": 3, "t0": "2019-09-01T05:00"}) and not pakai({"prov": "62", "sel": 2, "t0": "2019-09-01T05:00"})
        assert not pakai({"prov": "11", "sel": 30, "t0": "2019-09-01T05:00"}) and not pakai({"prov": "62", "sel": 30, "t0": "2019-03-01T05:00"})
        print("ok")
    elif sys.argv[1:2] == ["ekstra"]:
        ekstra(float(sys.argv[2]) if len(sys.argv) > 2 else 400)
    else:
        main()
