"""#9 OpenAQ v3 + MOS PM2,5: PM25_obs ~ b0 + b1*CAMS + b2*angin + b3*log1p(hujan 3 jam) -> public/udara/data/openaq_mos.json

Kunci : OPENAQ_KEY dari env (header X-API-Key), tidak pernah ditulis ke berkas. Tanpa kunci: status "MENUNGGU KUNCI", bagian OpenAQ kosong,
        dan MOS dihitung dari stasiun PM2,5 BMKG (omc_arsip.json) SEBAGAI PENGGANTI, diberi label sumber_obs yang jujur.
API   : GET https://api.openaq.org/v3/locations?iso=ID&parameters_id=2 (PM2,5 = parameter 2), lalu /v3/sensors/{id}/hours?datetime_from&datetime_to (batas 60 permintaan/menit:
        jeda 1,1 dtk). Parser diuji dengan fixture bentuk dokumentasi; Parser DIUJI ke respons live 30 Okt 2026 (/locations dan /sensors/{id}/hours: value + period.datetimeFrom.utc).
        Catatan:  ~40 sensor aktif, hampir semua AirGradient/Clarity (murah); untuk uji multi-tahun pakai openaq_arsip.py + uji_panen.py.
Syarat: OpenAQ mengumpulkan data pemerintah/pihak ketiga dengan lisensi per sumber; tampilkan atribusi "OpenAQ" dan penyedia asal (field provider).
Rumus : lihat pm25_mos.uji_mos. Uji: waktu 60/40, MAE vs CAMS mentah dan vs klimatologi stasiun, bootstrap per tanggal; LOLOS hanya bila keduanya lebih baik dengan batas atas selisih < 0.
Pakai : python3 scripts/udara/openaq_mos.py | uji
"""
import datetime as dt, json, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat, pm25_mos as m

BASIS = "https://api.openaq.org/v3/"
ATRIBUSI = "OpenAQ (openaq.org) dan penyedia asalnya; CAMS via Open-Meteo; stasiun PM2,5 BMKG sebagai pengganti. MOS dan uji: Centurisk97."


def _get(path, q, kunci):
    url = BASIS + path + "?" + urllib.parse.urlencode(q)
    def kerja():
        req = urllib.request.Request(url, headers={"X-API-Key": kunci, "User-Agent": alat.UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    try:
        d = m.coba(kerja)
    except Exception as e:   # pesan tanpa header/kunci
        raise RuntimeError(f"OpenAQ {path}: {type(e).__name__}") from None
    time.sleep(1.1)
    return d


def sensor_pm25(lokasi, sejak=None):
    """Balasan /locations -> [(id_sensor, lat, lon, nama)] hanya sensor parameter pm25 dengan koordinat, bukan 'indoor'.
    sejak='YYYY-MM-DD': buang lokasi yang datetimeLast.utc-nya lebih lama (live v3: 133 lokasi ID, sebagian besar mati sejak 2016-2025)."""
    out = []
    for L in lokasi.get("results", []):
        c = L.get("coordinates") or {}
        z = (L.get("datetimeLast") or {}).get("utc") or ""
        if "indoor" in (L.get("name") or "").lower() or (sejak and z[:10] < sejak):
            continue
        for s in L.get("sensors", []):
            if (s.get("parameter") or {}).get("name") == "pm25" and c.get("latitude") is not None:
                out.append((s["id"], c["latitude"], c["longitude"], L.get("name") or str(L.get("id"))))
    return out


def jam_sensor(hours):
    """Balasan /sensors/{id}/hours -> {'YYYY-MM-DDTHH': ug/m3} dengan awal periode UTC; nilai di luar 0..1000 dibuang."""
    out = {}
    for r in hours.get("results", []):
        v = r.get("value")
        t = (((r.get("period") or {}).get("datetimeFrom")) or {}).get("utc")
        if v is None or t is None or not 0 <= v <= 1000:
            continue
        out[t[:13]] = v
    return out


def unduh(kunci, hari=14, maks_sensor=40):
    lok = _get("locations", {"iso": "ID", "parameters_id": 2, "limit": 1000}, kunci)
    t1 = dt.datetime.now(dt.timezone.utc)
    t0 = t1 - dt.timedelta(days=hari)
    sen = sensor_pm25(lok, (t1 - dt.timedelta(days=3)).strftime("%Y-%m-%d"))[:maks_sensor]
    obs = {}
    for sid, la, lo, nama in sen:
        h = jam_sensor(_get(f"sensors/{sid}/hours", {"datetime_from": t0.strftime("%Y-%m-%dT%H:%M:%SZ"), "datetime_to": t1.strftime("%Y-%m-%dT%H:%M:%SZ"), "limit": 1000}, kunci))
        if len(h) >= 48:
            obs[f"OAQ{sid}"] = {"lat": la, "lon": lo, "h": h, "nama": nama}
    return obs


def jalankan():
    kunci = os.environ.get("OPENAQ_KEY")
    if not kunci:   # worktree/checkout lokal: hanya variabel itu dari .env
        import openaq_arsip
        kunci = openaq_arsip.kunci_env()
    arsip = json.load(open(os.path.join(alat.OUT, "omc_arsip.json")))
    obs_b = m.obs_bmkg(arsip)
    obs_o = unduh(kunci) if kunci else {}
    obs, sumber = (obs_o, "OpenAQ") if len(obs_o) >= 5 else (obs_b, "BMKG (pengganti, OpenAQ tidak tersedia)")
    titik = {i: (o["lat"], o["lon"]) for i, o in obs.items()}
    cams = m.cams_titik(titik)
    baris = m.gabung_titik(obs, cams, {i: {j: 0.0 for j in o["h"]} for i, o in obs.items()})   # GEOS-CF tidak dipakai di sini
    hasil = {"v": 1, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "atribusi": ATRIBUSI,
             "status_openaq": "AKTIF" if sumber == "OpenAQ" else "MENUNGGU KUNCI (OPENAQ_KEY)", "sumber_obs": sumber, "n_stasiun": len(obs), "mos": m.uji_mos(baris)}
    alat.simpan("openaq_mos.json", hasil)
    return hasil


def uji():
    lok = {"results": [{"id": 1, "name": "Jakarta A", "datetimeLast": {"utc": "2026-10-29T00:00:00Z"},"coordinates": {"latitude": -6.2, "longitude": 106.8},
                        "sensors": [{"id": 10, "parameter": {"name": "pm25"}}, {"id": 11, "parameter": {"name": "no2"}}]},
                       {"id": 2, "name": "Tanpa koordinat", "coordinates": {}, "sensors": [{"id": 12, "parameter": {"name": "pm25"}}]}]}
    assert sensor_pm25(lok) == [(10, -6.2, 106.8, "Jakarta A")]
    lok["results"].append({"id": 3, "name": "AG01(indoor)", "coordinates": {"latitude": 1, "longitude": 2}, "sensors": [{"id": 13, "parameter": {"name": "pm25"}}]})
    lok["results"].append({"id": 4, "name": "Mati", "coordinates": {"latitude": 1, "longitude": 2}, "datetimeLast": {"utc": "2016-11-09T16:00:00Z"}, "sensors": [{"id": 14, "parameter": {"name": "pm25"}}]})
    assert sensor_pm25(lok, "2026-10-01") == [(10, -6.2, 106.8, "Jakarta A")]
    jam = {"results": [{"value": 35.5, "period": {"datetimeFrom": {"utc": "2026-10-28T03:00:00Z"}}}, {"value": -999, "period": {"datetimeFrom": {"utc": "2026-10-28T04:00:00Z"}}},
                       {"value": None, "period": {"datetimeFrom": {"utc": "2026-10-28T05:00:00Z"}}}]}
    assert jam_sensor(jam) == {"2026-10-28T03": 35.5}
    print("openaq_mos uji ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        m.uji()
        uji()
    else:
        h = jalankan()
        print("openaq_mos:", h["status_openaq"], h["sumber_obs"], h["n_stasiun"], "stasiun;", h["mos"] and (h["mos"]["vonis"], h["mos"]["alasan"]))
