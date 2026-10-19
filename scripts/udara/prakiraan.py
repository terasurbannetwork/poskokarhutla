"""PM2,5 dan PM10 per jam 72 jam per kab/kota (CAMS via Open-Meteo) + koreksi stasiun + galat terhadap METAR -> prakiraan.json

Masukan : scripts/udara/kota.json (514 kab/kota, titik berbobot penduduk), Open-Meteo Air Quality (CAMS global, 31 hari lalu + 4 hari),
          env WAQI_TOKEN (opsional) untuk stasiun terukur, Iowa Environmental Mesonet (arsip METAR, network ID__ASOS) + public/data/metar.json.
Keluaran: public/udara/data/prakiraan.json (kontrak udara-kontrak.md), data/raw/udara/r24_kota.json (riwayat r24 per kota, untuk laporan),
          data/raw/udara/stasiun_arsip.json (pengukuran WAQI, bila ada token).
Koreksi : per stasiun, regresi lewat titik nol obs = f x CAMS pada pasangan jam 30 hari, f disusutkan ke 1:
          f* = (n f + K) / (n + K), K = 48 jam. Kota dalam 50 km: rata-rata f* berbobot 1/d^2, lalu dilemahkan linier ke 1 sampai 50 km.
          Galat out-of-sample: f dari pasangan > 7 hari lalu, diuji pada rata-rata harian 7 hari terakhir.
Galat METAR: kejadian teramati = hari WIB dengan >= 3 laporan HZ/FU dan jarak pandang < 5 km (>= 12 laporan sehari),
          kejadian model = r24 >= 55,5 di kota terdekat bandara (<= 50 km). Hari lampau saja (CAMS 31 hari lalu).
"""
import csv
import datetime as dt
import io
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

URL_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality"
URL_META = "https://air-quality-api.open-meteo.com/data/cams_global/static/meta.json"
URL_IEM_ST = "https://mesonet.agron.iastate.edu/geojson/network/ID__ASOS.geojson"
URL_IEM = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"
URL_WAQI = "https://api.waqi.info/map/bounds?latlng=-11.5,94.5,6.5,141.5&networks=all&token="
LALU = 31
K_SUSUT = 48
R_KOTA = 50
HARI_UJI = 7
ARSIP_HARI = 120
BOOT, BENIH = 2000, 20261018
MIN_N_PRAKIRAAN = 50
EPA2012 = [(0, 12.0, 0, 50), (12.1, 35.4, 51, 100), (35.5, 55.4, 101, 150), (55.5, 150.4, 151, 200),
           (150.5, 250.4, 201, 300), (250.5, 350.4, 301, 400), (350.5, 500.4, 401, 500)]


# ---------- CAMS ----------
def cams(titik):
    """titik [(lat, lon)] -> (waktu [datetime UTC], [(pm25[], pm10[])]) satu deret waktu bersama."""
    hasil, waktu = [], None
    for a in range(0, len(titik), 100):
        b = titik[a:a + 100]
        d = alat.ambil(f"{URL_AQ}?latitude={','.join(f'{x[0]:.3f}' for x in b)}&longitude={','.join(f'{x[1]:.3f}' for x in b)}"
                       f"&hourly=pm2_5,pm10&past_days={LALU}&forecast_days=4&timezone=GMT&domains=cams_global")
        for x in d if isinstance(d, list) else [d]:
            h = x["hourly"]
            w = [alat.dari_iso(t) for t in h["time"]]
            if waktu is None:
                waktu = w
            elif w != waktu:
                raise ValueError("deret waktu CAMS antar-titik berbeda")
            hasil.append((h["pm2_5"], h["pm10"]))
    if len(hasil) != len(titik):
        raise ValueError(f"CAMS mengirim {len(hasil)} titik, diminta {len(titik)}")
    return waktu, hasil


def r24(waktu, nilai, hari):
    """Rata-rata hari WIB (>= 18 jam terisi) untuk tiap tanggal di `hari`."""
    kel = {}
    for t, v in zip(waktu, nilai):
        if v is not None:
            if v < 0:
                raise ValueError(f"PM negatif {v} pada {t}")
            kel.setdefault(alat.hari_wib(t), []).append(v)
    return [round(sum(kel[h]) / len(kel[h]), 1) if len(kel.get(h, ())) >= 18 else None for h in hari]


# ---------- stasiun (WAQI) ----------
def aqi_ke_pm(aqi):
    """AQI PM2,5 US EPA (titik potong 2012, dipakai WAQI) -> ug/m3."""
    if not isinstance(aqi, (int, float)) or aqi < 0 or aqi > 500:
        return None
    for c0, c1, i0, i1 in EPA2012:
        if aqi <= i1:
            return round(c0 + (aqi - i0) * (c1 - c0) / (i1 - i0), 1)


def faktor(pasang):
    """pasang [(obs, model)] -> (f mentah, f disusutkan, n). Tanpa pasangan: (None, 1.0, 0)."""
    p = [(o, m) for o, m in pasang if o is not None and m is not None and m > 0]
    if not p:
        return None, 1.0, 0
    f = sum(o * m for o, m in p) / sum(m * m for _, m in p)
    f = min(3.0, max(0.2, f))
    n = len(p)
    return round(f, 3), round((n * f + K_SUSUT) / (n + K_SUSUT), 3), n


def faktor_kota(kota, stasiun):
    """stasiun [{id, lat, lon, f}] -> (f kota, id stasiun terdekat atau None)."""
    dk = [(alat.jarak_km(kota["lat"], kota["lon"], s["lat"], s["lon"]), s) for s in stasiun]
    dk = [(d, s) for d, s in dk if d <= R_KOTA]
    if not dk:
        return 1.0, None
    w = [1 / max(d, 5) ** 2 for d, _ in dk]
    fw = sum(wi * s["f"] for wi, (_, s) in zip(w, dk)) / sum(w)
    dmin, sdek = min(dk, key=lambda x: x[0])
    return round(1 + (fw - 1) * (1 - dmin / R_KOTA), 3), sdek["id"]


def arsip_waqi(token, arsip, t):
    """Tambah pengukuran saat ini ke arsip {uid: {lat, lon, nama, obs: {jam ISO: pm}}}; buang > 45 hari."""
    d = alat.ambil(URL_WAQI + token)
    if d.get("status") != "ok":
        raise RuntimeError(f"WAQI status {d.get('status')}: {str(d.get('data'))[:80]}")
    batas = alat.iso(t - dt.timedelta(days=45))
    for s in d["data"]:
        pm = aqi_ke_pm(float(s["aqi"])) if str(s.get("aqi", "")).replace(".", "").isdigit() else None
        if pm is None or not (-11.5 <= s["lat"] <= 6.5 and 94.5 <= s["lon"] <= 141.5):
            continue
        jam = s.get("station", {}).get("time")
        try:
            jam = alat.iso(alat.dari_iso(jam).replace(minute=0, second=0)) if jam else alat.iso(t)
        except ValueError:
            jam = alat.iso(t)
        a = arsip.setdefault(str(s["uid"]), {"lat": s["lat"], "lon": s["lon"], "nama": s.get("station", {}).get("name", ""), "obs": {}})
        a["obs"][jam] = pm
        a["obs"] = {k: v for k, v in a["obs"].items() if k >= batas}
    return arsip


def nilai_stasiun(arsip, waktu, seri, t):
    """arsip + deret CAMS di titik stasiun -> (stasiun [{id, lat, lon, f, n}], galat out-of-sample)."""
    idx = {alat.iso(w): k for k, w in enumerate(waktu)}
    batas_uji = t - dt.timedelta(days=HARI_UJI)
    st, uji_h = [], []
    for (uid, a), pm in zip(arsip.items(), seri):
        pasang = [(o, pm[idx[j]], alat.dari_iso(j)) for j, o in a["obs"].items() if j in idx]
        latih = [(o, m) for o, m, w in pasang if w < batas_uji]
        _, f_latih, _ = faktor(latih)
        _, f, n = faktor([(o, m) for o, m, _ in pasang])
        st.append({"id": uid, "lat": a["lat"], "lon": a["lon"], "f": f, "n": n})
        hari = {}
        for o, m, w in pasang:
            if w >= batas_uji and m is not None:
                hari.setdefault(alat.hari_wib(w), []).append((o, m * f_latih))
        for v in hari.values():
            if len(v) >= 12:
                uji_h.append((sum(x[0] for x in v) / len(v), sum(x[1] for x in v) / len(v)))
    if not uji_h:
        return st, None
    e = [m - o for o, m in uji_h]
    return st, {"n": len(uji_h), "bias": round(sum(e) / len(e), 1), "rmse": round(math.sqrt(sum(x * x for x in e) / len(e)), 1),
                "tepat_kategori": round(sum(alat.status(o) == alat.status(m) for o, m in uji_h) / len(uji_h), 3),
                "periode": f"{HARI_UJI} hari terakhir, rata-rata harian per stasiun"}


# ---------- METAR ----------
def metar_iem(stasiun, mulai, akhir):
    q = "&".join(f"station={s}" for s in stasiun)
    teks = alat.ambil(f"{URL_IEM}?{q}&data=vsby&data=wxcodes&year1={mulai.year}&month1={mulai.month}&day1={mulai.day}"
                      f"&year2={akhir.year}&month2={akhir.month}&day2={akhir.day}&tz=Etc/UTC&format=onlycomma&latlon=yes"
                      f"&missing=M&trace=T&direct=no&report_type=3&report_type=4", teks=True, timeout=300)
    return list(csv.DictReader(io.StringIO(teks)))


def kejadian_metar(baris):
    """CSV IEM -> {(icao, hari WIB): (laporan, laporan HZ/FU vis<5 km)}."""
    out = {}
    for r in baris:
        try:
            t = alat.dari_iso(r["valid"].replace(" ", "T"))
        except (ValueError, KeyError):
            continue
        k = (r["station"], alat.hari_wib(t))
        n, e = out.get(k, (0, 0))
        vis = float(r["vsby"]) * 1.609 if r.get("vsby") not in (None, "", "M") else None
        wx = r.get("wxcodes") or ""
        out[k] = (n + 1, e + (1 if vis is not None and vis < 5 and ("HZ" in wx or "FU" in wx) else 0))
    return out


def _skor(a, b, c, d):
    bagi = lambda x, y: x / y if y else None
    return bagi(a, a + c), bagi(b, a + b), bagi(a, a + b + c)


def skor_metar(kej, model, ulang=BOOT, benih=BENIH):
    """kej {(icao, hari): (n, e)}, model {(icao, hari): r24} -> skor kontingensi + selang bootstrap per bandara.

    Satuan hari-bandara. Kejadian model = status dari r24 yang DIBULATKAN (sama dengan yang tampil) bukan normal.
    Selang 95%: bandara diambil ulang dengan pengembalian (`ulang` kali, benih tetap), karena hari dalam satu bandara saling bergantung.
    """
    per = {}
    for k, (n, e) in kej.items():
        m = model.get(k)
        if n < 12 or m is None:
            continue
        o, p = e >= 3, alat.status(round(m)) != "normal"
        x = per.setdefault(k[0], [0, 0, 0, 0])
        x[0 if o and p else 1 if p else 2 if o else 3] += 1
    tot = [sum(x[i] for x in per.values()) for i in range(4)]
    h, f, c = _skor(*tot)
    bulat = lambda v: None if v is None else round(v, 3)
    out = {"n": sum(tot), "satuan": "hari-bandara", "n_bandara": len(per), "hit": bulat(h), "far": bulat(f), "csi": bulat(c),
           "tabel": {"hit": tot[0], "alarm_palsu": tot[1], "luput": tot[2], "benar_negatif": tot[3]}, "selang": None}
    if len(per) >= 2:
        rng, st = random.Random(benih), list(per.values())
        sampel = [[], [], []]
        for _ in range(ulang):
            pilih = [rng.choice(st) for _ in st]
            for i, v in enumerate(_skor(*(sum(x[j] for x in pilih) for j in range(4)))):
                if v is not None:
                    sampel[i].append(v)
        q = lambda a: [round(sorted(a)[int(.025 * (len(a) - 1))], 3), round(sorted(a)[int(.975 * (len(a) - 1))], 3)] if a else None
        out["selang"] = {"hit": q(sampel[0]), "far": q(sampel[1]), "csi": q(sampel[2]), "metode": f"bootstrap per bandara {ulang} ulangan, benih {benih}, 95%"}
    return out


# ---------- utama ----------
def arsip_jalan(arsip, jalan, hari, baris, maks_hari=90):
    """Tambah SATU entri per jalan (kunci = waktu jalan ISO): r24 3 hari tiap kab/kota. Append-only, tak pernah menimpa;
    entri dengan hari[0] lebih tua dari maks_hari hari dibuang supaya berkas bergulir. Bahan uji balik lead 0..2 (1-3 hari) kelak; belum ditampilkan."""
    if jalan in arsip:
        return arsip
    arsip[jalan] = {"hari": hari, "r24": {k["kode"]: k["r24"] for k in baris}}
    batas = (dt.date.fromisoformat(hari[0]) - dt.timedelta(days=maks_hari)).isoformat()
    return {j: v for j, v in sorted(arsip.items()) if v["hari"][0] >= batas}


def hitung(kota, waktu, seri, t, f_kota):
    """kota + deret CAMS -> (baris kota prakiraan.json, hari, jam, r24 lampau {kode: {tgl: r24}})."""
    if t not in waktu:
        raise ValueError(f"jam sekarang {alat.iso(t)} tidak ada di deret CAMS")
    i0 = waktu.index(t)
    if len(waktu) - i0 < 72:
        raise ValueError(f"deret CAMS hanya {len(waktu) - i0} jam ke depan, perlu 72")
    h0 = dt.date.fromisoformat(alat.hari_wib(t))
    hari = [(h0 + dt.timedelta(days=k)).isoformat() for k in range(3)]
    lampau = sorted({alat.hari_wib(w) for w in waktu if alat.hari_wib(w) < hari[0]})
    out, rw = [], {}
    for k, (pm25, pm10) in zip(kota, seri):
        f, sid = f_kota.get(k["kode"], (1.0, None))
        kor = [None if v is None else v * f for v in pm25]
        r = r24(waktu, kor, hari)
        if None in r:
            raise ValueError(f"{k['kode']}: r24 kosong {r}")
        rw[k["kode"]] = dict(zip(lampau, r24(waktu, kor, lampau)))
        out.append({"kode": k["kode"], "nama": k["nama"], "prov": k["prov"], "lat": k["lat"], "lon": k["lon"], "jiwa": k.get("jiwa"),
                    "pm": [None if v is None else round(v) for v in kor[i0:i0 + 72]],
                    "mentah": [None if v is None else round(v) for v in pm25[i0:i0 + 72]],
                    "pm10": [None if v is None else round(v * f) for v in pm10[i0:i0 + 72]],
                    "r24": [round(x) for x in r], "st": [alat.status(round(x)) for x in r], "asap": [None, None, None], "stasiun": sid})
    return out, hari, [alat.iso(w) for w in waktu[i0:i0 + 72]], rw


def main():
    t = alat.sekarang()
    kota = alat.kota()
    token = os.environ.get("WAQI_TOKEN", "").strip()
    arsip_p = os.path.join(alat.RAW, "stasiun_arsip.json")
    arsip = {}
    if token:
        try:
            arsip = arsip_waqi(token, alat.muat(arsip_p, {}), t)
            alat.simpan(arsip_p, arsip)
        except Exception as e:
            alat.log(f"::warning title=udara WAQI::{e}")
            arsip = {}
    titik = [(k["lat"], k["lon"]) for k in kota] + [(a["lat"], a["lon"]) for a in arsip.values()]
    waktu, seri = cams(titik)
    st, galat_st = nilai_stasiun(arsip, waktu, [s[0] for s in seri[len(kota):]], t) if arsip else ([], None)
    st = [s for s in st if s["n"]]
    f_kota = {k["kode"]: faktor_kota(k, st) for k in kota} if st else {}
    baris, hari, jam, rw = hitung(kota, waktu, seri[:len(kota)], t, f_kota)

    # riwayat r24 kota (untuk laporan): hari lampau ditimpa analisis terbaru, simpan 120 hari
    rp = os.path.join(alat.RAW, "r24_kota.json")
    lama = alat.muat(rp, {})
    for kode, d in rw.items():
        lama.setdefault(kode, {}).update({h: v for h, v in d.items() if v is not None})
    batas = (dt.date.fromisoformat(hari[0]) - dt.timedelta(days=ARSIP_HARI)).isoformat()
    lama = {k: {h: v for h, v in sorted(d.items()) if h >= batas} for k, d in lama.items()}
    alat.simpan(rp, lama)

    # arsip prakiraan append-only: r24 hari+1 dan +2 per kota per tanggal jalan (hari WIB); jalan kedua di hari yang sama tidak menimpa
    ap = os.path.join(alat.RAW, "prakiraan_arsip.json")
    arsip_pr = alat.muat(ap, {})
    if hari[0] not in arsip_pr:
        arsip_pr[hari[0]] = {k["kode"]: k["r24"][1:3] for k in baris}
        alat.simpan(ap, arsip_pr)

    # arsip tiap jalan (2x sehari): ringkasan r24 3 hari per kab/kota, berkas bergulir 90 hari di data/raw/udara (cache CI)
    aj = os.path.join(alat.RAW, "prakiraan_jalan.json")
    alat.simpan(aj, arsip_jalan(alat.muat(aj, {}), alat.iso(t), hari, baris))

    # galat METAR: (1) analisis CAMS hari lampau; (2) prakiraan hari+1 dari arsip, hanya bila n >= 50 hari-bandara
    galat_metar = galat_pr = None
    try:
        geo = alat.ambil(URL_IEM_ST)
        bandara = {f["properties"]["sid"]: f["geometry"]["coordinates"] for f in geo["features"]}
        for m in alat.data("metar.json", []):
            bandara.setdefault(m["icao"], [m["lon"], m["lat"]])
        dekat = {}
        for icao, (lo, la) in bandara.items():
            d, k = min((alat.jarak_km(la, lo, k["lat"], k["lon"]), k["kode"]) for k in kota)
            if d <= R_KOTA:
                dekat[icao] = k
        mulai = t - dt.timedelta(days=LALU - 1)
        kej = {k: v for k, v in kejadian_metar(metar_iem(sorted(dekat), mulai, t + dt.timedelta(days=1))).items() if k[1] < hari[0]}
        model = {(icao, h): rw[k][h] for icao, k in dekat.items() for h in rw[k] if rw[k][h] is not None}
        galat_metar = skor_metar(kej, model)
        hh = sorted({k[1] for k in model})
        galat_metar.update(jenis="analisis", periode=f"{hh[0]}..{hh[-1]} (hari WIB lampau)",
                           definisi=("Analisis CAMS hari lampau (deret past_days Open-Meteo), BUKAN prakiraan 1-3 hari: "
                                     "kejadian teramati = METAR HZ/FU dengan jarak pandang < 5 km pada >= 3 laporan sehari (>= 12 laporan); "
                                     "kejadian model = r24 kota terdekat bandara (<= 50 km) berstatus Tidak sehat atau lebih"))
        pr = {}
        for tj, isi in arsip_pr.items():
            besok = (dt.date.fromisoformat(tj) + dt.timedelta(days=1)).isoformat()
            if besok < hari[0]:
                for icao, k in dekat.items():
                    if isi.get(k):
                        pr[(icao, besok)] = isi[k][0]
        sp = skor_metar(kej, pr)
        if sp["n"] >= MIN_N_PRAKIRAAN:
            galat_pr = dict(sp, jenis="prakiraan_h+1", periode=f"{min(k[1] for k in pr)}..{max(k[1] for k in pr)}",
                            definisi="Prakiraan r24 hari+1 dari arsip jalan pipeline vs kejadian METAR yang sama")
        else:
            alat.log(f"galat prakiraan: baru {sp['n']} hari-bandara (< {MIN_N_PRAKIRAAN}), metar_prakiraan = null")
    except Exception as e:
        alat.log(f"::warning title=udara galat METAR::{e}")

    try:
        run = dt.datetime.fromtimestamp(alat.ambil(URL_META)["last_run_initialisation_time"], dt.timezone.utc)
        jalan_model = alat.iso(run)
    except Exception:
        jalan_model = None
    fm = sorted(v[0] for v in f_kota.values() if v[1])
    d = {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "jalan_model": jalan_model, "jam": jam, "hari": hari, "kota": baris,
         "koreksi": {"status": "terkoreksi" if fm else "belum",
                     "metode": ("regresi lewat nol per stasiun WAQI 30 hari, susut ke 1 (K=48 jam), kota <=50 km berbobot 1/d^2" if fm
                                else "tanpa stasiun terukur (WAQI_TOKEN tak ada); angka mentah CAMS"),
                     "n_stasiun": len(st), "faktor_median": fm[len(fm) // 2] if fm else 1.0},
         "galat": {"stasiun": galat_st, "metar": galat_metar, "metar_prakiraan": galat_pr},
         "sumber": "CAMS (Copernicus) via Open-Meteo; METAR via Iowa Environmental Mesonet"}
    lama_p = alat.keluaran("prakiraan.json", {})
    if lama_p.get("kota") and lama_p.get("hari") == hari:   # asap dari atribusi jalan sebelumnya tetap selama hari sama
        a = {k["kode"]: k.get("asap") for k in lama_p["kota"]}
        for k in baris:
            k["asap"] = a.get(k["kode"]) or k["asap"]
    nb = alat.simpan("prakiraan.json", d)
    top = sorted(baris, key=lambda k: -k["r24"][0])[:3]
    alat.log(f"prakiraan.json: {nb // 1024} KB, {len(baris)} kota, terburuk {[(k['nama'], k['r24']) for k in top]}; METAR {galat_metar and {x: galat_metar[x] for x in ('n', 'hit', 'far', 'csi')}}")


def uji():
    W = [dt.datetime(2026, 10, 17, 17, tzinfo=dt.timezone.utc) + dt.timedelta(hours=k) for k in range(24 * 5)]
    assert r24(W, [10.0] * 24 + [70.0] * 24 + [None] * 72, ["2026-10-18", "2026-10-19", "2026-10-20"]) == [10.0, 70.0, None]
    try:
        r24(W[:2], [5, -1], ["2026-10-18"])
        raise AssertionError("PM negatif harus ditolak")
    except ValueError:
        pass
    assert aqi_ke_pm(50) == 12.0 and aqi_ke_pm(151) == 55.5 and aqi_ke_pm(-3) is None and aqi_ke_pm(900) is None and aqi_ke_pm("x") is None
    assert faktor([]) == (None, 1.0, 0)
    f, fs, n = faktor([(20, 10)] * 48)          # stasiun 2x model, 48 jam -> separuh jalan ke 1
    assert (f, fs, n) == (2.0, 1.5, 48), (f, fs, n)
    assert faktor([(200, 1)] * 1000)[0] == 3.0  # faktor dijepit 0,2..3
    kt = {"lat": 0, "lon": 0}
    assert faktor_kota(kt, [{"id": "a", "lat": 0, "lon": 1, "f": 2.0}]) == (1.0, None)       # 111 km: di luar radius
    fk, sid = faktor_kota(kt, [{"id": "a", "lat": 0, "lon": .1125, "f": 2.0}])           # 12,5 km: 75% dari 2,0
    assert sid == "a" and abs(fk - 1.75) < .01, fk
    # galat out-of-sample: model 1/2 obs 30 hari -> f latih (552x2+48)/600 = 1,92 (susut), bias 40x1,92-80 = -3,2
    t = dt.datetime(2026, 10, 18, 0, tzinfo=dt.timezone.utc)
    waktu = [t - dt.timedelta(hours=k) for k in range(30 * 24, 0, -1)]
    arsip = {"9": {"lat": 0, "lon": 0, "obs": {alat.iso(w): 80.0 for w in waktu}}}
    st, g = nilai_stasiun(arsip, waktu, [[40.0] * len(waktu)], t)
    assert st[0]["f"] > 1.9 and g["n"] >= 6 and abs(g["bias"] + 3.2) < .1 and g["tepat_kategori"] == 1.0, (st, g)
    # METAR
    rows = [{"station": "WIPP", "valid": f"2026-10-16 {j:02d}:00", "vsby": "1.86" if j < 5 else "6.21", "wxcodes": "FU" if j < 5 else "M"} for j in range(24)]
    rows += [{"station": "WIPP", "valid": "2026-10-16 05:30", "vsby": "M", "wxcodes": "FU"}, {"station": "WIPP", "valid": "rusak", "vsby": "1", "wxcodes": "FU"}]
    kej = kejadian_metar(rows)
    assert kej[("WIPP", "2026-10-16")] == (18, 5) and kej[("WIPP", "2026-10-17")] == (7, 0), kej
    kej2 = {("A", "d1"): (24, 5), ("A", "d2"): (24, 0), ("A", "d3"): (24, 4), ("A", "d4"): (24, 0), ("A", "d5"): (5, 9)}
    s = skor_metar(kej2, {("A", "d1"): 80, ("A", "d2"): 60, ("A", "d3"): 20, ("A", "d4"): 10, ("A", "d5"): 99})
    assert (s["n"], s["hit"], s["far"], s["csi"], s["n_bandara"]) == (4, .5, .5, .333, 1), s   # d5 dibuang: laporan < 12
    assert s["selang"] is None                                                                 # 1 bandara: tak ada selang
    assert skor_metar({("A", "d1"): (24, 0)}, {("A", "d1"): 55.4})["tabel"]["benar_negatif"] == 1   # 55,4 tampil 55: normal
    kej3 = {(b, f"d{i}"): (24, 5 if i < 5 else 0) for b in "ABCD" for i in range(10)}
    mod3 = {(b, f"d{i}"): (90 if (i < 5) == (b in "AB") else 10) for b in "ABCD" for i in range(10)}   # A,B sempurna; C,D terbalik
    s3 = skor_metar(kej3, mod3)
    assert s3["n"] == 40 and s3["n_bandara"] == 4 and s3["csi"] == .333 and s3["selang"]["csi"][0] < .333 < s3["selang"]["csi"][1], s3
    assert skor_metar(kej3, mod3) == s3                                                            # benih tetap: hasil sama
    # hitung: jam sekarang harus ada dan 72 jam ke depan harus tersedia
    W = [dt.datetime(2026, 10, 15, 17, tzinfo=dt.timezone.utc) + dt.timedelta(hours=k) for k in range(24 * 7)]
    kota = [{"kode": "1671", "nama": "Kota Palembang", "prov": "16", "lat": -2.97, "lon": 104.75}]
    seri = [([60.0] * len(W), [90.0] * len(W))]
    b, hari, jam, rw = hitung(kota, W, seri, dt.datetime(2026, 10, 18, 3, tzinfo=dt.timezone.utc), {"1671": (1.5, "x")})
    assert hari == ["2026-10-18", "2026-10-19", "2026-10-20"] and len(jam) == 72 and jam[0] == "2026-10-18T03:00Z"
    assert b[0]["pm"][0] == 90 and b[0]["mentah"][0] == 60 and b[0]["r24"] == [90, 90, 90] and b[0]["st"] == ["waspada"] * 3 and b[0]["stasiun"] == "x"
    assert rw["1671"]["2026-10-16"] == 90.0 and "2026-10-18" not in rw["1671"]
    for salah in (dt.datetime(2026, 10, 21, 3, tzinfo=dt.timezone.utc), dt.datetime(2030, 1, 1, tzinfo=dt.timezone.utc)):
        try:
            hitung(kota, W, seri, salah, {})
            raise AssertionError(f"jam {salah} harus ditolak")
        except ValueError:
            pass
    # arsip jalan: append-only, jalan sama tak menimpa, entri lewat 90 hari dibuang
    brs = [{"kode": "1671", "r24": [90, 80, 70]}]
    a = arsip_jalan({}, "2026-10-18T03:00Z", ["2026-10-18", "2026-10-19", "2026-10-20"], brs)
    assert a["2026-10-18T03:00Z"]["r24"]["1671"] == [90, 80, 70]
    assert arsip_jalan(a, "2026-10-18T03:00Z", ["2026-10-18", "2026-10-19", "2026-10-20"], [{"kode": "1671", "r24": [1, 1, 1]}]) == a
    b2 = arsip_jalan(a, "2026-10-18T15:00Z", ["2026-10-18", "2026-10-19", "2026-10-20"], brs)
    assert len(b2) == 2
    b3 = arsip_jalan(b2, "2027-02-01T03:00Z", ["2027-02-01", "2027-02-02", "2027-02-03"], brs)
    assert list(b3) == ["2027-02-01T03:00Z"], b3
    print("prakiraan uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
