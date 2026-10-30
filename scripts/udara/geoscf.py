"""#10 NASA GEOS-CF + CAMS: ensambel bobot 1/MSE terhadap stasiun PM2,5 BMKG -> public/udara/data/geoscf.json

Rumus : bobot_k = (1/MSE_k) / sum(1/MSE) pada jam LATIH, tiap anggota dikoreksi bias latihnya dulu; ensambel = sum(bobot_k * (x_k - bias_k)).
Uji   : pembagian waktu 60/40 pada jam stasiun (omc_arsip.pm25), MAE uji ensambel vs anggota terbaik, selang 95% bootstrap per tanggal.
        Vonis LOLOS hanya bila MAE ensambel < MAE anggota terbaik DAN batas atas selisih < 0. Bila GAGAL, kolom `pm_rata_ensambel` tetap ditulis
        tetapi `pm_rata_dipakai` = anggota terbaik.
Label : tidak ada label CO; bobot PM2,5 DIPINJAM untuk CO (bukan hasil uji) dan ditandai.
Sumber: NASA GMAO GEOS-CF (OPeNDAP), CAMS via Open-Meteo. Jalan: udara.yml (2x/hari) bila dirantai; python3 scripts/udara/geoscf.py | uji
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat, pm25_mos as m

ATRIBUSI = "NASA GMAO GEOS-CF (OPeNDAP); CAMS (Copernicus) via Open-Meteo; stasiun PM2,5 BMKG. Ensambel dan uji: Centurisk97."
WIB = dt.timedelta(hours=7)


def harian(deret, fungsi):
    """{jam UTC: nilai} -> {tanggal WIB: fungsi(nilai jam)} hanya hari dengan >= 18 jam."""
    per = {}
    for j, v in deret.items():
        if v is None or v != v:
            continue
        t = dt.datetime.strptime(j, "%Y-%m-%dT%H") + WIB
        per.setdefault(t.strftime("%Y-%m-%d"), []).append(v)
    return {d: round(fungsi(v), 1) for d, v in sorted(per.items()) if len(v) >= 18}


def prakiraan_stasiun(titik, cams, gf, uji):
    bobot = (uji or {}).get("bobot_koreksi_bias") or {"cams": .5, "geoscf": .5}
    bias = (uji or {}).get("bias_latih") or {"cams": 0, "geoscf": 0}
    pakai = bool(uji and uji["vonis"] == "LOLOS")
    rata = lambda v: sum(v) / len(v)
    out = []
    for i in sorted(titik):
        c = {j: x["cams"] for j, x in cams[i].items() if x["cams"] is not None}
        g = {j: x["gcf"] for j, x in gf.get(i, {}).items()}
        co_c = {j: x["co"] for j, x in cams[i].items() if x["co"] is not None}
        co_g = {j: x["gcf_co"] for j, x in gf.get(i, {}).items()}
        ens = {j: max(0.0, bobot["cams"] * (c[j] - bias["cams"]) + bobot["geoscf"] * (g[j] - bias["geoscf"])) for j in g if j in c}
        co_e = {j: bobot["cams"] * co_c[j] + bobot["geoscf"] * co_g[j] for j in co_g if j in co_c}
        pilih = ens if pakai else (c if uji and uji["anggota_terbaik"] == "cams" else g)
        row = {"id": i, "lat": titik[i][0], "lon": titik[i][1], "pm_rata_cams": harian({j: v for j, v in c.items() if j in g}, rata),
               "pm_rata_geoscf": harian(g, rata), "pm_rata_ensambel": harian(ens, rata),
               "pm_rata_dipakai": harian({j: v for j, v in pilih.items() if j in g}, rata), "co_maks_ensambel_ugm3": harian(co_e, max)}
        if row["pm_rata_geoscf"]:
            out.append(row)
    return out


def jalankan(ambil_fn=None):
    arsip = json.load(open(os.path.join(alat.OUT, "omc_arsip.json")))
    obs = m.obs_bmkg(arsip)
    titik = {i: (o["lat"], o["lon"]) for i, o in obs.items()}
    cams = m.cams_titik(titik, ambil_fn=ambil_fn)
    jam = sorted(j for o in obs.values() for j in o["h"])
    akhir = min(dt.datetime.strptime(jam[-1], "%Y-%m-%dT%H"), dt.datetime.now(dt.timezone.utc).replace(tzinfo=None) - dt.timedelta(hours=36))
    gcf = m.gcf_ana(titik, dt.datetime.strptime(jam[0], "%Y-%m-%dT%H"), akhir)
    baris = m.gabung_titik(obs, cams, gcf)
    uji = m.uji_ensambel(baris)
    gf = m.gcf_fcst(titik)
    hasil = {"v": 1, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "atribusi": ATRIBUSI,
             "lisensi": "GEOS-CF: data terbuka NASA GMAO, sebut sumber; CAMS: Copernicus, sebut sumber",
             "obs_sumber": "stasiun PM2,5 BMKG (omc_arsip.json)", "n_stasiun_obs": len(obs), "periode_obs_utc": [jam[0], jam[-1]],
             "catatan_uji": "bobot dilatih pada ANALISIS jam lampau kedua model vs stasiun, lalu dipakai pada prakiraan; skor prakiraan sungguhan belum ada",
             "uji": uji, "co": {"bobot_dipinjam_dari_pm25": True, "catatan": "tanpa label CO; ensambel CO = rata-rata berbobot pinjaman, bukan hasil uji"},
             "stasiun": prakiraan_stasiun(titik, cams, gf, uji)}
    alat.simpan("geoscf.json", hasil)
    return hasil


def uji():
    jam = {f"2026-10-{d:02d}T{h:02d}": 1.0 for d in (28, 29, 30) for h in range(24)}
    h = harian(jam, lambda v: sum(v) / len(v))
    assert h == {"2026-10-29": 1.0, "2026-10-30": 1.0}, h   # 28 Okt WIB tak lengkap (17 jam dari 24 UTC), 31 Okt tak lengkap
    titik = {"A": (0.0, 100.0)}
    c = {j: {"cams": 20.0, "co": 100.0} for j in jam}
    g = {j: {"gcf": 10.0, "gcf_co": 50.0} for j in jam}
    u = {"vonis": "LOLOS", "bobot_koreksi_bias": {"cams": .5, "geoscf": .5}, "bias_latih": {"cams": 0, "geoscf": 0}, "anggota_terbaik": "cams"}
    r = prakiraan_stasiun(titik, {"A": c}, {"A": g}, u)[0]
    assert r["pm_rata_ensambel"]["2026-10-29"] == 15.0 and r["co_maks_ensambel_ugm3"]["2026-10-29"] == 75.0, r
    assert r["pm_rata_dipakai"] == r["pm_rata_ensambel"]
    u["vonis"] = "GAGAL"
    assert prakiraan_stasiun(titik, {"A": c}, {"A": g}, u)[0]["pm_rata_dipakai"]["2026-10-29"] == 20.0   # GAGAL: anggota terbaik
    print("geoscf uji ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        m.uji()
        uji()
    else:
        h = jalankan()
        print("geoscf:", h["n_stasiun_obs"], "stasiun;", h["uji"] and (h["uji"]["vonis"], h["uji"]["alasan"]))
