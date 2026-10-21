"""Pengumpul arsip evaluasi OMC: PM2.5 BMKG, METAR IEM, ringkasan titik panas, per jam UTC, idempoten.

Keluaran: public/udara/data/omc_arsip.json (deret padat {t0, kanal:[...]}; None = jam bolong).
Pakai:  python3 scripts/omc/panen.py        panen sekali (dirantai di akhir scripts/udara/jalan.py)
        python3 scripts/omc/panen.py uji    self-check luring

Aturan: satu sumber gagal tidak menghapus sumber lain; format BMKG berubah => sumber itu GAGAL KERAS dan arsipnya
tidak disentuh; semua sumber gagal => berkas tidak ditulis sama sekali. `dibuat` ditulis sekali dan tidak pernah diganti.
Lisensi: PM2.5 BMKG (izin pakai ulang belum terverifikasi, tampilkan berlabel BMKG); METAR diolah IEM.
"""
import csv
import datetime as dt
import io
import json
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../udara"))
import alat

BERKAS = os.path.join(alat.OUT, "omc_arsip.json")
URL_BMKG = "https://cews.bmkg.go.id/tempatirk/TEMPORARY/dashboard_pm2p5.html"
URL_IEM = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"
BANDARA = ["WITT", "WIMN", "WIMM", "WIEE", "WIBB", "WIDD", "WIDN", "WIPP", "WILL", "WIOO", "WAOO", "WALL", "WAQQ"]  # Sumatera + Kalimantan, daftar online IEM
PROV = {"11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "61", "62", "63", "64", "65"}   # kode BPS Sumatera + Kalimantan
SIMPAN_HARI = 180
ISI_MUNDUR_HARI = 30
MIN_STASIUN = 10   # kurang dari ini = format/halaman berubah, bukan data
WIB = alat.WIB
UTC = dt.timezone.utc


# ------------------------------------------------------------------ deret padat
def jam_idx(d):
    """datetime sadar-zona -> indeks jam sejak epoch UTC."""
    return int(d.timestamp() // 3600)


def idx_iso(h):
    return dt.datetime.fromtimestamp(h * 3600, UTC).strftime("%Y-%m-%dT%H")


def iso_idx(s):
    return jam_idx(dt.datetime.strptime(s, "%Y-%m-%dT%H").replace(tzinfo=UTC))


def ke_dict(seri):
    """{jam_idx: {kanal: nilai}} tanpa None."""
    t0 = iso_idx(seri["t0"])
    out = {}
    for k, v in seri.items():
        if isinstance(v, list):
            for i, x in enumerate(v):
                if x is not None:
                    out.setdefault(t0 + i, {})[k] = x
    return out


def dari_dict(d, meta, kanal):
    """Balik ke deret padat; meta (lat, lon) dibawa."""
    if not d:
        return None
    a, b = min(d), max(d)
    s = dict(meta)
    s["t0"] = idx_iso(a)
    for k in kanal:
        s[k] = [d.get(h, {}).get(k) for h in range(a, b + 1)]
    return s


def gabung(seri, baru, kanal, batas, maks=False):
    """Gabung {jam_idx:{kanal:nilai}} ke seri lama (boleh None): nilai baru menimpa, `maks` ambil yang terbesar; pangkas < batas."""
    meta = {k: v for k, v in (seri or {}).items() if k != "t0" and not isinstance(v, list)}
    d = ke_dict(seri) if seri else {}
    for h, kv in baru.items():
        for k, v in kv.items():
            lama = d.get(h, {}).get(k)
            d.setdefault(h, {})[k] = max(lama, v) if maks and lama is not None else v
    d = {h: kv for h, kv in d.items() if h >= batas}
    return dari_dict(d, meta, kanal)


# ------------------------------------------------------------------ sumber 1: PM2.5 BMKG
def urai_bmkg(html):
    """{nama: {lat, lon, jam: {idx: pm25}}}. Melempar ValueError pada format tak dikenal (tanpa tebakan)."""
    i = html.find("const dashboardData = ")
    if i < 0:
        raise ValueError("BMKG: 'const dashboardData' tidak ada")
    try:
        d, _ = json.JSONDecoder().raw_decode(html[i + len("const dashboardData = "):])
        loc = d["locations"]
    except (ValueError, KeyError, TypeError) as e:
        raise ValueError(f"BMKG: blob dashboardData rusak ({type(e).__name__})") from None
    if not isinstance(loc, dict) or len(loc) < MIN_STASIUN:
        raise ValueError(f"BMKG: stasiun {len(loc) if isinstance(loc, dict) else '?'} < {MIN_STASIUN}")
    out = {}
    for nama, s in loc.items():
        try:
            lab, val = s["timeseries"]["labels"], s["timeseries"]["values"]
            lat, lon = float(s["latitude"]), float(s["longitude"])
            if not isinstance(lab, list) or len(lab) != len(val):
                raise ValueError("labels/values tak sama panjang")
            jam = {}
            for l, v in zip(lab, val):
                if v is None:
                    continue
                v = float(v)
                if not 0 <= v <= 2000:
                    raise ValueError(f"pm25 {v} di luar 0..2000")
                jam[jam_idx(dt.datetime.strptime(l, "%Y-%m-%d %H:%M").replace(tzinfo=WIB))] = round(v, 1)   # label = WIB
        except (KeyError, TypeError, ValueError) as e:
            raise ValueError(f"BMKG: stasiun {nama} rusak: {e}") from None
        out[nama] = {"lat": lat, "lon": lon, "jam": jam}
    if not any(s["jam"] for s in out.values()):
        raise ValueError("BMKG: semua deret kosong")
    return out


def panen_pm25(arsip, batas, html=None):
    st = urai_bmkg(html if html is not None else alat.ambil(URL_BMKG, teks=True, timeout=60))
    ada = arsip.setdefault("pm25", {})
    baru = {}
    for nama, s in st.items():
        g = gabung(ada.get(nama), {h: {"v": v} for h, v in s["jam"].items()}, ["v"], batas)
        if g:
            g["lat"], g["lon"] = s["lat"], s["lon"]
            baru[nama] = g
    ada.update(baru)   # stasiun yang hilang dari halaman tetap di arsip
    return len(baru)


# ------------------------------------------------------------------ sumber 2: METAR IEM
def urai_metar(teks):
    """{icao: {idx: {vis, wx}}}: jarak pandang minimum (m) dan gabungan kode cuaca per jam UTC."""
    out = {}
    for r in csv.DictReader(io.StringIO(teks)):
        try:
            h = jam_idx(dt.datetime.strptime(r["valid"], "%Y-%m-%d %H:%M").replace(tzinfo=UTC))
            icao = r["station"]
        except (KeyError, ValueError, TypeError):
            continue
        k = out.setdefault(icao, {}).setdefault(h, {})
        try:
            vis = round(float(r["vsby"]) * 1609.344 / 10) * 10
            k["vis"] = min(k["vis"], vis) if "vis" in k else vis
        except (KeyError, ValueError, TypeError):
            pass
        wx = set((k.get("wx") or "").split()) | {w for w in (r.get("wxcodes") or "").split() if w != "M"}
        k["wx"] = " ".join(sorted(wx))
    return {s: {h: kv for h, kv in d.items() if "vis" in kv or kv["wx"]} for s, d in out.items()}


def panen_metar(arsip, batas, sekarang, teks=None):
    ada = arsip.setdefault("metar", {})
    if teks is None:
        terakhir = [iso_idx(s["t0"]) + len(s["vis"]) for s in ada.values() if s.get("vis")]
        # ada arsip: ulang 2 hari ke belakang (menambal bolong); belum ada: isi mundur 30 hari
        mulai = (sekarang - dt.timedelta(days=2)) if terakhir and len(ada) >= len(BANDARA) // 2 else sekarang - dt.timedelta(days=ISI_MUNDUR_HARI)
        akhir = sekarang + dt.timedelta(days=1)
        q = {"station": BANDARA, "data": ["vsby", "wxcodes"], "year1": mulai.year, "month1": mulai.month, "day1": mulai.day,
             "year2": akhir.year, "month2": akhir.month, "day2": akhir.day, "tz": "Etc/UTC", "format": "onlycomma",
             "latlon": "no", "missing": "M", "trace": "T", "direct": "no", "report_type": [3, 4]}
        teks = alat.ambil(URL_IEM + "?" + urllib.parse.urlencode(q, doseq=True), teks=True, timeout=120)
    if not teks.lstrip().startswith("station,"):
        raise ValueError("IEM: kepala CSV tak dikenal")
    st = urai_metar(teks)
    if not st:
        raise ValueError("IEM: tak satu pun baris terurai")
    for icao, d in st.items():
        g = gabung(ada.get(icao), d, ["vis", "wx"], batas)
        if g:
            ada[icao] = g
    return len(st)


# ------------------------------------------------------------------ sumber 3: titik panas (data repo, opsional)
def panen_titik(arsip, batas, hs=None):
    """Jumlah titik per provinsi (Sumatera + Kalimantan) per jam UTC dari public/data/hotspot24.json; ambil maks bila jendela terpotong."""
    hs = hs if hs is not None else alat.data("hotspot24.json")
    acuan = dt.datetime.fromisoformat(hs["acuan"])
    kol = {k: i for i, k in enumerate(hs["kolom"])}
    cacah = {}
    for b in hs["baris"]:
        p = hs["wilayah"][b[kol["wilayah"]]].split("|")[0][:2]
        if p in PROV:
            h = jam_idx(acuan + dt.timedelta(hours=b[kol["jam"]]))
            cacah.setdefault(p, {}).setdefault(h, {"n": 0})["n"] += 1
    ada = arsip.setdefault("titik", {})
    for p, d in cacah.items():
        g = gabung(ada.get(p), d, ["n"], batas, maks=True)
        if g:
            ada[p] = g
    return len(cacah)


SUMBER = {"pm25": panen_pm25, "metar": panen_metar, "titik": panen_titik}


# ------------------------------------------------------------------ gabung semua
def jalankan(berkas=BERKAS, sekarang=None, masukan=None):
    """Satu putaran panen. `masukan` ({sumber: teks/dict}) hanya untuk uji. Mengembalikan (jumlah sumber ok, gagal[])."""
    sekarang = sekarang or dt.datetime.now(UTC)
    masukan = masukan or {}
    if os.path.exists(berkas):
        try:
            arsip = alat.muat(berkas)
        except ValueError as e:   # arsip rusak: jangan ditimpa, orang harus melihat
            raise SystemExit(f"omc_arsip.json tak terbaca, tidak ditimpa: {e}")
    else:
        arsip = {"dibuat": sekarang.strftime("%Y-%m-%dT%H:%M:%SZ")}
    batas = jam_idx(sekarang - dt.timedelta(days=SIMPAN_HARI))
    arsip.setdefault("sumber", {})
    ok, gagal = [], []
    for nama, fn in SUMBER.items():
        salinan = json.loads(json.dumps(arsip.get(nama, {})))   # bagian sumber ini saja yang dipulihkan bila gagal di tengah
        try:
            if nama == "metar":
                n = fn(arsip, batas, sekarang, masukan.get(nama))
            else:
                n = fn(arsip, batas, masukan.get(nama))
            arsip["sumber"][nama] = {"ok": sekarang.strftime("%Y-%m-%dT%H:%MZ"), "n": n}
            ok.append(nama)
        except Exception as e:
            arsip[nama] = salinan
            gagal.append(nama)
            arsip["sumber"].setdefault(nama, {})["galat"] = f"{type(e).__name__}: {str(e)[:160]}"
            alat.log(f"::warning title=omc panen {nama} gagal::{type(e).__name__}: {str(e)[:300]}")
    if not ok:
        raise RuntimeError("omc panen: semua sumber gagal, arsip tidak ditulis")
    for nama in ok:
        arsip["sumber"][nama].pop("galat", None)
    arsip["diperbarui"] = sekarang.strftime("%Y-%m-%dT%H:%M:%SZ")
    arsip["label"] = {"pm25": "BMKG", "metar": "METAR (diolah IEM)", "titik": "Pantau Bencana (titik panas)"}
    arsip["gagal"] = gagal
    kb = alat.simpan(berkas, arsip)
    alat.log(f"omc_arsip: ok {','.join(ok)}; gagal {','.join(gagal) or '-'}; {kb / 1024:.0f} KB")
    return ok, gagal


def main():
    return jalankan()


# ------------------------------------------------------------------ self-check
def uji():
    import tempfile
    now = dt.datetime(2026, 10, 21, 12, 0, tzinfo=UTC)

    def bmkg(vals, n=12, t="2026-10-21 08:00"):
        loc = {f"S{i}": {"latitude": -2.0, "longitude": 114.0 + i, "latest": {},
                         "timeseries": {"labels": [f"2026-10-21 {8 + j:02d}:00" for j in range(len(vals))], "values": vals}}
               for i in range(n)}
        return "x\nconst dashboardData = " + json.dumps({"locations": loc, "top10": []}) + ";\nconst markers = {};"

    csv_ = ("station,valid,vsby,wxcodes\nWIPP,2026-10-21 00:00,0.12,FU\nWIPP,2026-10-21 00:30,0.50,M\n"
            "WIPP,2026-10-21 01:00,1.55,M\nWAOO,2026-10-21 00:00,M,RA\nWAOO,2026-10-21 01:00,6.21,M\n")
    # 1. pengurai BMKG: WIB -> UTC (08.00 WIB = 01.00Z), null dilewati
    p = urai_bmkg(bmkg([41.3, None, 50.0]))
    assert len(p) == 12 and sorted(p["S0"]["jam"].values()) == [41.3, 50.0]
    assert min(p["S0"]["jam"]) == jam_idx(dt.datetime(2026, 10, 21, 1, tzinfo=UTC))
    # 2. METAR: mil -> m, jam yang sama ambil minimum, kode cuaca digabung
    m = urai_metar(csv_)
    h0 = jam_idx(dt.datetime(2026, 10, 21, 0, tzinfo=UTC))
    assert m["WIPP"][h0] == {"vis": 190, "wx": "FU"} and m["WAOO"][h0] == {"wx": "RA"}
    with tempfile.TemporaryDirectory() as td:
        f = os.path.join(td, "a.json")
        mas = {"pm25": bmkg([41.3, 42.0, 43.0]), "metar": csv_, "titik": {"acuan": "2026-10-21T12:00:00+00:00", "kolom": ["jam", "wilayah"],
               "wilayah": ["16|a|b", "31|c|d"], "baris": [[-0.5, 0], [-0.2, 0], [-0.1, 1]]}}
        ok, g = jalankan(f, now, mas)
        assert ok == ["pm25", "metar", "titik"] and not g
        a1 = alat.muat(f)
        dibuat = a1["dibuat"]
        assert a1["titik"]["16"]["n"] == [2] and "31" not in a1["titik"]   # hanya Sumatera + Kalimantan
        # 3. idempoten + dedupe: ulang masukan sama => deret sama, `dibuat` tetap walau waktu jalan beda
        jalankan(f, now + dt.timedelta(hours=6), mas)
        a2 = alat.muat(f)
        assert a2["dibuat"] == dibuat
        for k in ("pm25", "metar", "titik"):
            assert a2[k] == a1[k], k
        assert a2["pm25"]["S0"]["v"] == [41.3, 42.0, 43.0] and a2["metar"]["WIPP"]["vis"] == [190, 2490]
        # 4. satu sumber gagal (format BMKG rusak) tidak menimpa pm25 dan tidak menghapus sumber lain
        sebelum = json.dumps(a2["pm25"], sort_keys=True)
        rusak = dict(mas, pm25="<html>tanpa blob</html>", metar=csv_.replace("0.12", "0.20"))
        ok, g = jalankan(f, now, rusak)
        a3 = alat.muat(f)
        assert g == ["pm25"] and json.dumps(a3["pm25"], sort_keys=True) == sebelum and a3["gagal"] == ["pm25"]
        assert a3["metar"]["WIPP"]["vis"][0] == 320 and "galat" in a3["sumber"]["pm25"]   # metar tetap ditulis (nilai baru menimpa)
        # 5. blob terlalu sedikit stasiun / nilai absurd = gagal keras
        for html in (bmkg([1.0], n=3), bmkg([99999.0])):
            try:
                urai_bmkg(html)
                raise AssertionError("harusnya gagal")
            except ValueError:
                pass
        # 6. semua gagal => tidak menulis, berkas utuh
        mt = os.path.getmtime(f)
        try:
            jalankan(f, now, {"pm25": "x", "metar": "bukan csv", "titik": {"acuan": "bad"}})
            raise AssertionError("harusnya melempar")
        except RuntimeError:
            pass
        assert os.path.getmtime(f) == mt
        # 7. pangkas: deret lebih tua dari 180 hari hilang, yang baru tetap
        lama = jam_idx(now - dt.timedelta(days=200))
        sd = gabung(None, {lama: {"v": 1.0}, lama + 5: {"v": 2.0}, jam_idx(now): {"v": 3.0}}, ["v"], jam_idx(now - dt.timedelta(days=SIMPAN_HARI)))
        assert sd["v"] == [3.0] and sd["t0"] == idx_iso(jam_idx(now))
        # 8. arsip rusak tidak ditimpa
        open(f, "w").write("{rusak")
        try:
            jalankan(f, now, mas)
            raise AssertionError("harusnya berhenti")
        except SystemExit:
            assert open(f).read() == "{rusak"
    print("uji panen: ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        try:
            main()
        except Exception as e:
            print(f"panen gagal: {e}", file=sys.stderr)
            sys.exit(1)
