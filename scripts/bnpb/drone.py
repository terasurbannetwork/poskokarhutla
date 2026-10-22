"""Pengirim drone otomatis ke api karhutla yang penting -> misi KMZ (DJI WPML) + log misi di data/raw/drone/.

Rencana lengkap, vendor, sensor, regulasi, dan hitungan armada: docs/bnpb/RENCANA-DRONE.md.

Alur satu putaran (dijalankan tiap 10 menit, sama dengan irama Himawari-9):
  1. kandidat  /api/himawari (Pantau Bencana). Gerbang keras, supaya drone hanya untuk api yang layak:
               KECIL = lewati: FRP < 30 MW (kelas "kecil" lingkaran Himawari di peta).
               SEKILAS = lewati: < 3 pindaian 10 menit (belum bertahan 20 menit), level < 2, atau tak terlihat lagi > 60 menit.
  2. skor      FRP (MW), lama bertahan, "api baru" (Himawari melihat sebelum NASA FIRMS), level 3 = menyala: 0-100.
               Cuaca menambah peluang membesar: udara kering (RH < 60%) +10, angin >= 4 m/s +5.
               Gambut kering menambah peluang api masuk ke bawah permukaan dan sulit padam: DC > 350 +10 (ambang BMKG
               "sangat kering"), TMAT lebih dalam dari 40 cm +10 (batas PP 57/2016).
               AKAN PADAM SENDIRI = lewati: hujan >= 5 mm diperkirakan dalam 3 jam ke depan DAN gambutnya tidak kering.
               Gambut basah = TMAT stasiun terdekat <= 40 cm di bawah permukaan dan DC < 261; tanpa TMAT, DC < 261;
               tanpa keduanya, hujan saja (hipotesis lama). Gambut kering (DC > 350 atau TMAT > 40 cm) TIDAK pernah
               dianggap padam oleh hujan: bara di bawah permukaan bertahan. DC 261-350 tanpa TMAT = ragu = tetap dikirim.
  3. saring    sudah ada misi <= 2 km dalam 3 jam terakhir = lewati (tidak mengirim drone dua kali ke api yang sama).
  4. dock      dock terdekat dalam radius kerjanya, siap (tidak sedang terbang), di jam terang (PM 37/2020: siang saja).
  5. cuaca     Open-Meteo di lokasi api: hembusan <= 10 m/s (batas pabrik 12), hujan < 0,5 mm/jam.
  6. misi      orbit 8 titik radius 150 m di 120 m (batas tinggi PM 37/2020), kamera menghadap api, foto termal + lebar
               tiap titik, lalu satu foto tegak lurus di atas api; pulang ke dock. Jarak + waktu diuji terhadap baterai.
  7. kirim     mode "usul" (bawaan): misi ditulis "menunggu", petugas menyetujui dengan --setujui ID.
               mode "otomatis": skor >= ambang_otomatis langsung dikirim ke jembatan (webhook) tanpa menunggu.
               Pilot jarak jauh tetap penanggung jawab terbang; jembatan yang meneruskan ke DJI Cloud API/FlightHub 2.
  8. patroli   dock yang menganggur setelah langkah 1-7, di area gambut kering (DC > 350 di dock, atau stasiun TMAT > 40 cm
               dalam jangkauan), cuaca layak, belum 2 patroli hari ini (WIB) dan belum patroli 3 jam terakhir: terbang
               pencegahan tanpa menunggu titik panas. Rute = stasiun TMAT kering terdekat (foto tegak lurus di atasnya,
               sebanyak baterai cukup), atau cincin 8 titik radius 1,8 km mengelilingi dock bila tak ada stasiun.
               Mencari bara yang belum cukup besar untuk satelit. Patroli tidak menghalangi misi api (bukan "api yang sama").

Data gambut: DC dari /data/fwi.json Pantau Bencana (kisi 0,5 derajat, hari ini WIB; kasar, sekitar 55 km, jadi pendukung,
bukan penentu blok). TMAT dari berkas armada.tmat: JSON hasil GET /api/ops/tmat ({stasiun: [...]}) atau CSV unggahan
(id, lat, lon, tmat_cm, waktu, sumber); tmat_cm negatif = muka air di bawah permukaan. Stasiun terdekat <= 10 km dan
pembacaan <= 72 jam; lebih jauh/tua dianggap tidak ada.

Jembatan: skrip ini TIDAK bicara MQTT ke dock. Ia mengirim POST JSON {misi, kmz_b64, mqtt} ke armada.webhook. `mqtt` berisi
dua pesan DJI Cloud API (flighttask_prepare lalu flighttask_execute) untuk topik thing/product/<sn_dock>/services; jembatan
menaruh KMZ di penyimpanan yang bisa diunduh dock, mengisi file.url, lalu menerbitkannya. Bentuk pesan mengikuti dokumentasi
Cloud API Dock 2/3 dan HARUS dicocokkan dengan versi firmware sebelum dipakai (lihat RENCANA-DRONE.md, "Yang belum diuji").

Armada (JSON, contoh: scripts/bnpb/drone_armada.contoh.json): dock [{id, sn, lat, lon, radius_km}], drone_enum/payload_enum
(salin dari KMZ yang diekspor FlightHub 2 untuk drone itu), mode, ambang, webhook, tmat, patroli_per_hari.
Tanpa webhook = kering: KMZ + log saja.

Pakai:
  python3 scripts/bnpb/drone.py --armada armada.json            # satu putaran
  python3 scripts/bnpb/drone.py --armada armada.json --setujui ID
  python3 scripts/bnpb/drone.py --ukur 1000 --radius 6           # berapa dock untuk 1.000 km2
  python3 scripts/bnpb/drone.py --uji                            # self-check tanpa jaringan

ponytail: skor aturan tangan, bukan model teruji (belum ada data misi untuk melatihnya); ganti dengan peluang eskalasi
model_sebaran bila uji baliknya lulus di tingkat titik. Satu misi aktif per dock; antrean = putaran berikutnya.
"""
import argparse, base64, datetime as dt, hashlib, io, json, math, os, sys, urllib.request, zipfile
from xml.sax.saxutils import escape

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
KEADAAN = os.path.join(AKAR, "data", "raw", "drone")
SUMBER = "https://centurisk97.id/api/himawari"
FWI = "https://centurisk97.id/data/fwi.json"
WIB = dt.timezone(dt.timedelta(hours=7))

# Semua ambang di sini; --uji membaca nilainya.
SARING = {"level_min": 2, "n_min": 3, "umur_menit": 60, "frp_min": 30.0}
ULANG = {"km": 2.0, "jam": 3}                     # api yang sama tidak dikirimi drone dua kali dalam 3 jam
CUACA = {"hembus_ms": 10.0, "hujan_mm": 0.5, "padam_hujan_3j_mm": 5.0, "rh_kering": 60, "angin_sebar_ms": 4.0}
MISI = {"tinggi_m": 120, "orbit_m": 150, "titik": 8, "laju_ms": 12, "jeda_foto_s": 5, "baterai_menit": 25, "rth_m": 120}
SKOR = {"frp_jenuh": 300, "n_jenuh": 6, "kirim": 50, "otomatis": 70, "tambah_maks": 35}   # tambah = cuaca 15 + gambut 20
GAMBUT = {"dc_kering": 350, "dc_basah": 261, "tmat_kering_cm": -40, "tmat_km": 10, "tmat_umur_jam": 72, "dc_sel": 0.5, "bonus_dc": 10, "bonus_tmat": 10}
PATROLI = {"per_dock_hari": 2, "jeda_jam": 3, "cincin_m": 1800, "titik": 8}
R_BUMI = 6371.0088


def ambil(url, timeout=30):
    """GET JSON. User-Agent sendiri: Cloudflare menolak (403) User-Agent bawaan urllib."""
    with urllib.request.urlopen(urllib.request.Request(url, headers={"user-agent": "PantauBencana-drone/1"}), timeout=timeout) as r:
        return json.load(r)


def km(a, b, c, d):
    """Jarak lingkaran besar (km) antara (lat a, lon b) dan (lat c, lon d)."""
    p, q = math.radians(c - a), math.radians(d - b)
    h = math.sin(p / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(q / 2) ** 2
    return 2 * R_BUMI * math.asin(math.sqrt(h))


def geser(lat, lon, arah_deg, jarak_m):
    """Titik sejauh jarak_m dari (lat, lon) ke arah arah_deg (0 = utara). Aproksimasi datar, cukup untuk < 1 km."""
    t = math.radians(arah_deg)
    return (lat + jarak_m * math.cos(t) / 111320.0,
            lon + jarak_m * math.sin(t) / (111320.0 * math.cos(math.radians(lat))))


# ================================================================ kandidat dan skor
def kandidat(hw):
    """Baris /api/himawari -> api yang bertahan. Kolom dibaca dari hw['kolom'], bukan urutan tetap."""
    k = {n: i for i, n in enumerate(hw.get("kolom") or [])}
    perlu = ("lat", "lon", "u", "frp", "level", "n", "baru")
    if any(x not in k for x in perlu):
        raise ValueError("kolom /api/himawari berubah: " + ", ".join(x for x in perlu if x not in k))
    wil = hw.get("wilayah") or []
    out = []
    for b in hw.get("baris") or []:
        a = {x: b[k[x]] for x in perlu}
        if (a["level"] < SARING["level_min"] or a["n"] < SARING["n_min"] or a["u"] > SARING["umur_menit"]
                or (a["frp"] or 0) < SARING["frp_min"]):
            continue
        w = b[k["w"]] if "w" in k and k["w"] < len(b) else None
        a["wilayah"] = wil[w] if isinstance(w, int) and 0 <= w < len(wil) else None
        a["skor"] = skor(a)
        out.append(a)
    return sorted(out, key=lambda a: -a["skor"])


def skor(a):
    """0-100: FRP 50, bertahan 20, api baru 20, menyala (level 3) 10."""
    s = 50 * min(a["frp"] or 0, SKOR["frp_jenuh"]) / SKOR["frp_jenuh"] + 20 * min(a["n"], SKOR["n_jenuh"]) / SKOR["n_jenuh"]
    return round(s + (20 if a["baru"] == 1 else 0) + (10 if a["level"] >= 3 else 0), 1)


def sudah_dikirim(a, riwayat, kini):
    batas = kini - dt.timedelta(hours=ULANG["jam"])
    return any(km(a["lat"], a["lon"], m["lat"], m["lon"]) <= ULANG["km"] and dt.datetime.fromisoformat(m["dibuat"]) >= batas
               for m in riwayat if m["status"] != "batal" and m.get("jenis", "api") == "api")


def pilih_dock(a, docks, sibuk):
    """Dock terdekat yang jangkauannya mencakup api dan tidak sedang punya misi aktif. None bila tidak ada."""
    cocok = [(km(a["lat"], a["lon"], d["lat"], d["lon"]), d) for d in docks if d["id"] not in sibuk]
    cocok = [(j, d) for j, d in cocok if j <= d.get("radius_km", 6)]
    return min(cocok, key=lambda x: x[0]) if cocok else None


# ================================================================ cuaca
def cuaca(lat, lon):
    url = ("https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f"
           "&current=wind_speed_10m,wind_gusts_10m,precipitation,relative_humidity_2m,is_day"
           "&hourly=precipitation&forecast_hours=3&wind_speed_unit=ms&timezone=UTC" % (lat, lon))
    d = ambil(url, 20)
    c = d["current"]
    return {"angin_ms": c["wind_speed_10m"], "hembus_ms": c["wind_gusts_10m"], "hujan_mm": c["precipitation"], "terang": c["is_day"] == 1,
            "rh": c["relative_humidity_2m"], "hujan_3j_mm": round(sum(x or 0 for x in d["hourly"]["precipitation"]), 1)}


def tambah_cuaca(c):
    """Bonus skor peluang membesar: kering +10, berangin +5 (maks SKOR['cuaca_maks'])."""
    return (10 if c["rh"] < CUACA["rh_kering"] else 0) + (5 if c["angin_ms"] >= CUACA["angin_sebar_ms"] else 0)


# ================================================================ gambut (DC kisi FWI + TMAT stasiun)
def muat_dc(fwi):
    """fwi.json -> [(lat, lon, dc)] hari ini WIB (hari_ini). Sel tanpa nilai hari itu dilewati."""
    h = fwi.get("hari_ini")
    out = []
    for c in fwi.get("grid") or []:
        v = next((x.get("dc") for x in c.get("hari") or [] if x.get("tgl") == h), None)
        if v is not None:
            out.append((c["lat"], c["lon"], v))
    return out


def dc_di(grid, lat, lon):
    """DC sel kisi yang memuat titik (tengah sel <= setengah lebar sel); None di luar kisi."""
    s = GAMBUT["dc_sel"] / 2
    c = [(abs(la - lat) + abs(lo - lon), v) for la, lo, v in grid if abs(la - lat) <= s and abs(lo - lon) <= s]
    return min(c)[1] if c else None


def _waktu(v):
    if isinstance(v, (int, float)):
        return dt.datetime.fromtimestamp(v / 1000 if v > 1e11 else v, dt.timezone.utc)
    w = dt.datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    return w if w.tzinfo else w.replace(tzinfo=WIB)


def muat_tmat(path):
    """Berkas TMAT -> [{stasiun, lat, lon, tmat_cm, waktu}], pembacaan terakhir tiap stasiun. JSON /api/ops/tmat atau CSV unggahan."""
    if not path:
        return []
    teks = open(path, encoding="utf-8").read()
    if path.endswith(".json"):
        baris = [{"stasiun": x["stasiun"], "lat": x["lat"], "lon": x["lon"], "tmat_cm": x["tmat_cm"], "waktu": _waktu(x["waktu"])}
                 for x in json.loads(teks)["stasiun"]]
    else:
        import csv
        baris = [{"stasiun": x["id"], "lat": float(x["lat"]), "lon": float(x["lon"]), "tmat_cm": float(x["tmat_cm"]), "waktu": _waktu(x["waktu"])}
                 for x in csv.DictReader(io.StringIO(teks))]
    akhir = {}
    for b in baris:
        if b["stasiun"] not in akhir or b["waktu"] > akhir[b["stasiun"]]["waktu"]:
            akhir[b["stasiun"]] = b
    return list(akhir.values())


def tmat_segar(stasiun, kini):
    return [s for s in stasiun if kini - s["waktu"] <= dt.timedelta(hours=GAMBUT["tmat_umur_jam"])]


def gambut_di(lat, lon, dc_grid, stasiun):
    """{dc, tmat_cm, stasiun}: DC sel kisi + stasiun TMAT segar terdekat <= GAMBUT['tmat_km']. stasiun sudah disaring tmat_segar."""
    t = min(((km(lat, lon, s["lat"], s["lon"]), s) for s in stasiun), key=lambda x: x[0], default=None)
    t = t[1] if t and t[0] <= GAMBUT["tmat_km"] else None
    return {"dc": dc_di(dc_grid, lat, lon), "tmat_cm": t["tmat_cm"] if t else None, "stasiun": t["stasiun"] if t else None}


def gambut_kering(g):
    return (g["dc"] is not None and g["dc"] > GAMBUT["dc_kering"]) or (g["tmat_cm"] is not None and g["tmat_cm"] < GAMBUT["tmat_kering_cm"])


def gambut_basah(g):
    if g["tmat_cm"] is not None:
        return g["tmat_cm"] >= GAMBUT["tmat_kering_cm"] and (g["dc"] is None or g["dc"] < GAMBUT["dc_basah"])
    if g["dc"] is not None:
        return g["dc"] < GAMBUT["dc_basah"]
    return True                                           # tanpa data gambut: hujan saja yang menentukan (hipotesis lama)


def tambah_gambut(g):
    return ((GAMBUT["bonus_dc"] if g["dc"] is not None and g["dc"] > GAMBUT["dc_kering"] else 0)
            + (GAMBUT["bonus_tmat"] if g["tmat_cm"] is not None and g["tmat_cm"] < GAMBUT["tmat_kering_cm"] else 0))


def akan_padam(c, g):
    """Hujan memadamkan hanya bila gambutnya basah; gambut kering atau ragu tetap dikirimi drone."""
    return c["hujan_3j_mm"] >= CUACA["padam_hujan_3j_mm"] and not gambut_kering(g) and gambut_basah(g)


def layak_terbang(c):
    """Daftar alasan TIDAK terbang (kosong = layak)."""
    al = []
    if not c["terang"]:
        al.append("di luar jam terang (PM 37/2020 hanya siang tanpa izin khusus)")
    if c["hembus_ms"] > CUACA["hembus_ms"]:
        al.append("hembusan %.1f m/s > %.0f m/s" % (c["hembus_ms"], CUACA["hembus_ms"]))
    if c["hujan_mm"] >= CUACA["hujan_mm"]:
        al.append("hujan %.1f mm/jam" % c["hujan_mm"])
    return al


# ================================================================ misi
def titik_misi(a, d):
    """Orbit MISI['titik'] titik mengelilingi api, mulai dari sisi yang menghadap dock, lalu satu titik di atas api."""
    arah0 = math.degrees(math.atan2(math.radians(d["lon"] - a["lon"]) * math.cos(math.radians(a["lat"])), math.radians(d["lat"] - a["lat"])))
    n = MISI["titik"]
    orbit = [geser(a["lat"], a["lon"], arah0 + 360.0 * i / n, MISI["orbit_m"]) for i in range(n)]
    return orbit + [(a["lat"], a["lon"])]


def anggaran(d, pts):
    """(jarak_km, menit) pergi-orbit-pulang, termasuk jeda foto. Dibandingkan dengan MISI['baterai_menit']."""
    jalur = [(d["lat"], d["lon"])] + pts + [(d["lat"], d["lon"])]
    j = sum(km(*jalur[i], *jalur[i + 1]) for i in range(len(jalur) - 1))
    return round(j, 2), round(j * 1000 / MISI["laju_ms"] / 60 + len(pts) * MISI["jeda_foto_s"] / 60 + 2, 1)   # +2 menit lepas landas/mendarat


def _aksi(i, pitch):
    """Grup aksi satu titik: arahkan gimbal, potret (termal + lebar)."""
    return f"""<wpml:actionGroup><wpml:actionGroupId>{i}</wpml:actionGroupId><wpml:actionGroupStartIndex>{i}</wpml:actionGroupStartIndex>
<wpml:actionGroupEndIndex>{i}</wpml:actionGroupEndIndex><wpml:actionGroupMode>sequence</wpml:actionGroupMode>
<wpml:actionTrigger><wpml:actionTriggerType>reachPoint</wpml:actionTriggerType></wpml:actionTrigger>
<wpml:action><wpml:actionId>0</wpml:actionId><wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc><wpml:actionActuatorFuncParam>
<wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode><wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
<wpml:gimbalPitchRotateAngle>{pitch}</wpml:gimbalPitchRotateAngle><wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
<wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle><wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
<wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle><wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
<wpml:gimbalRotateTime>0</wpml:gimbalRotateTime><wpml:payloadPositionIndex>0</wpml:payloadPositionIndex></wpml:actionActuatorFuncParam></wpml:action>
<wpml:action><wpml:actionId>1</wpml:actionId><wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc><wpml:actionActuatorFuncParam>
<wpml:fileSuffix>api{i}</wpml:fileSuffix><wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
<wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex><wpml:payloadLensIndex>ir,wide</wpml:payloadLensIndex></wpml:actionActuatorFuncParam></wpml:action>
</wpml:actionGroup>"""


def kmz(d, pts, armada, nama, poi=None):
    """KMZ (zip) berisi wpmz/template.kml + wpmz/waylines.wpml. Ketinggian relatif titik lepas landas (dock):
    lahan gambut datar; di perbukitan pakai mode ketinggian AGL FlightHub 2 alih-alih berkas ini.
    poi (lat, lon) = misi api: kamera menghadap api, -45 derajat, titik terakhir tegak lurus. Tanpa poi = patroli: tiap titik tegak lurus."""
    j, menit = anggaran(d, pts)
    titik_poi = "%.7f,%.7f,0" % (poi or pts[0])
    cfg = f"""<wpml:missionConfig><wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode><wpml:finishAction>goHome</wpml:finishAction>
<wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost><wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
<wpml:takeOffSecurityHeight>20</wpml:takeOffSecurityHeight><wpml:globalTransitionalSpeed>{MISI['laju_ms']}</wpml:globalTransitionalSpeed>
<wpml:globalRTHHeight>{MISI['rth_m']}</wpml:globalRTHHeight>
<wpml:droneInfo><wpml:droneEnumValue>{armada['drone_enum']}</wpml:droneEnumValue><wpml:droneSubEnumValue>{armada['drone_sub_enum']}</wpml:droneSubEnumValue></wpml:droneInfo>
<wpml:payloadInfo><wpml:payloadEnumValue>{armada['payload_enum']}</wpml:payloadEnumValue><wpml:payloadPositionIndex>0</wpml:payloadPositionIndex></wpml:payloadInfo>
</wpml:missionConfig>"""
    tanda = []
    for i, (la, lo) in enumerate(pts):
        atas = poi is None or i == len(pts) - 1
        tanda.append(f"""<Placemark><Point><coordinates>{lo:.7f},{la:.7f}</coordinates></Point><wpml:index>{i}</wpml:index>
<wpml:executeHeight>{MISI['tinggi_m']}</wpml:executeHeight><wpml:waypointSpeed>{MISI['laju_ms']}</wpml:waypointSpeed>
<wpml:waypointHeadingParam><wpml:waypointHeadingMode>{'followWayline' if atas else 'towardPOI'}</wpml:waypointHeadingMode>
<wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle><wpml:waypointPoiPoint>{titik_poi}</wpml:waypointPoiPoint>
<wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode></wpml:waypointHeadingParam>
<wpml:waypointTurnParam><wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
<wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist></wpml:waypointTurnParam><wpml:useStraightLine>1</wpml:useStraightLine>
{_aksi(i, -90 if atas else -45)}</Placemark>""")
    kepala = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6"><Document>'
    nama = escape(nama)
    template = f"{kepala}<wpml:author>Pantau Bencana</wpml:author>{cfg}<Folder><name>{nama}</name></Folder></Document></kml>"
    wayline = (f"{kepala}{cfg}<Folder><wpml:templateId>0</wpml:templateId><wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>"
               f"<wpml:waylineId>0</wpml:waylineId><wpml:distance>{j * 1000:.0f}</wpml:distance><wpml:duration>{menit * 60:.0f}</wpml:duration>"
               f"<wpml:autoFlightSpeed>{MISI['laju_ms']}</wpml:autoFlightSpeed>{''.join(tanda)}</Folder></Document></kml>")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("wpmz/template.kml", template)
        z.writestr("wpmz/waylines.wpml", wayline)
    return buf.getvalue()


def pesan_mqtt(misi_id, sn, berkas, kini):
    """Dua pesan Cloud API untuk thing/product/<sn>/services. file.url diisi jembatan setelah KMZ diunggah ke penyimpanannya."""
    ts = int(kini.timestamp() * 1000)
    md5 = hashlib.md5(berkas).hexdigest()
    siap = {"tid": misi_id + "-p", "bid": misi_id, "timestamp": ts, "method": "flighttask_prepare",
            "data": {"flight_id": misi_id, "execute_time": ts, "task_type": 0, "wayline_type": 0,
                     "file": {"url": None, "fingerprint": md5}, "rth_altitude": MISI["rth_m"],
                     "out_of_control_action": 0, "exit_wayline_when_rc_lost": 1}}
    jalan = {"tid": misi_id + "-e", "bid": misi_id, "timestamp": ts, "method": "flighttask_execute", "data": {"flight_id": misi_id}}
    return {"topik": f"thing/product/{sn}/services", "pesan": [siap, jalan]}


# ================================================================ keadaan (riwayat misi)
def baca_riwayat(folder):
    p = os.path.join(folder, "riwayat.json")
    return json.load(open(p)) if os.path.exists(p) else []


def tulis_riwayat(folder, r):
    os.makedirs(folder, exist_ok=True)
    tmp = os.path.join(folder, "riwayat.json.tmp")
    json.dump(r[-2000:], open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, os.path.join(folder, "riwayat.json"))


def kirim(misi, berkas, armada):
    """POST ke jembatan. Tanpa webhook = kering (berhasil, tidak ada yang terbang)."""
    if not armada.get("webhook"):
        return "kering"
    isi = json.dumps({"misi": misi, "kmz_b64": base64.b64encode(berkas).decode(), "mqtt": misi["mqtt"]}).encode()
    req = urllib.request.Request(armada["webhook"], data=isi, method="POST",
                                 headers={"content-type": "application/json", "x-kunci": os.environ.get("DRONE_KUNCI", "")})
    with urllib.request.urlopen(req, timeout=30) as r:
        return "terkirim" if 200 <= r.status < 300 else "gagal %d" % r.status


# ================================================================ putaran
def simpan_misi(misi, berkas, armada, folder, otomatis):
    """Status akhir misi + KMZ ke disk. otomatis = boleh dikirim tanpa persetujuan (mode otomatis dan lolos ambangnya)."""
    if misi["alasan_tunda"]:
        misi["status"] = "batal"
    elif armada.get("mode") == "otomatis" and otomatis:
        misi["status"] = kirim(misi, berkas, armada)
    else:
        misi["status"] = "menunggu"
    os.makedirs(os.path.join(folder, "misi"), exist_ok=True)
    open(os.path.join(folder, "misi", misi["id"] + ".kmz"), "wb").write(berkas)
    return misi


def putaran(hw, armada, riwayat, kini, cuaca_fn, folder, dc_grid=(), stasiun=()):
    """Satu putaran: misi api, lalu patroli pencegahan untuk dock yang menganggur. Mengembalikan daftar misi baru
    (riwayat ikut bertambah). cuaca_fn, dc_grid, stasiun disuntik supaya --uji tanpa jaringan."""
    aktif = [m for m in riwayat if m["status"] in ("menunggu", "terkirim", "kering")
             and dt.datetime.fromisoformat(m["dibuat"]) >= kini - dt.timedelta(minutes=MISI["baterai_menit"] + 30)]
    sibuk = {m["dock"] for m in aktif if m.get("jenis", "api") == "api"}
    patroli_aktif = {m["dock"]: m["id"] for m in aktif if m.get("jenis") == "patroli"}   # misi api mendahului patroli
    ambang = armada.get("ambang", SKOR["kirim"]); ambang_oto = armada.get("ambang_otomatis", SKOR["otomatis"])
    stasiun = tmat_segar(stasiun, kini)
    baru, cache = [], {}
    for a in kandidat(hw):
        if a["skor"] + SKOR["tambah_maks"] < ambang:
            break                                         # urut menurun: sisanya tak mungkin lolos meski cuaca dan gambut mendukung
        if sudah_dikirim(a, riwayat + baru, kini):
            continue
        pd = pilih_dock(a, armada["dock"], sibuk)
        if not pd:
            continue                                      # cuaca hanya ditanya untuk api yang terjangkau dock: hemat panggilan
        kunci = (round(a["lat"], 1), round(a["lon"], 1))
        c = cache[kunci] if kunci in cache else cache.setdefault(kunci, cuaca_fn(a["lat"], a["lon"]))
        g = gambut_di(a["lat"], a["lon"], dc_grid, stasiun)
        if akan_padam(c, g):
            continue                                      # hujan lebat di gambut basah: dibiarkan, tidak dicatat sebagai misi
        a["skor"] = round(a["skor"] + tambah_cuaca(c) + tambah_gambut(g), 1)
        if a["skor"] < ambang:
            continue
        jarak, d = pd
        pts = titik_misi(a, d)
        j, menit = anggaran(d, pts)
        alasan = [] if menit <= MISI["baterai_menit"] else ["butuh %.0f menit > baterai %d menit" % (menit, MISI["baterai_menit"])]
        if not alasan:
            alasan = layak_terbang(c)
        mid = hashlib.sha1(f"{d['id']}|{a['lat']}|{a['lon']}|{kini.isoformat()}".encode()).hexdigest()[:16]
        berkas = kmz(d, pts, armada, f"api {a['lat']:.4f},{a['lon']:.4f} dari {d['id']}", poi=(a["lat"], a["lon"]))
        misi = {"id": mid, "jenis": "api", "dibuat": kini.isoformat(), "dock": d["id"], "lat": a["lat"], "lon": a["lon"], "wilayah": a["wilayah"],
                "skor": a["skor"], "frp": a["frp"], "baru": a["baru"], "jarak_dock_km": round(jarak, 2), "jalur_km": j, "menit": menit,
                "rh": c["rh"], "hujan_3j_mm": c["hujan_3j_mm"], "dc": g["dc"], "tmat_cm": g["tmat_cm"], "tmat_stasiun": g["stasiun"],
                "alasan_tunda": alasan, "mqtt": pesan_mqtt(mid, d["sn"], berkas, kini)}
        if d["id"] in patroli_aktif and not alasan:
            misi["hentikan"] = patroli_aktif[d["id"]]     # jembatan memanggil drone patroli pulang dulu, baru misi ini
        baru.append(simpan_misi(misi, berkas, armada, folder, a["skor"] >= ambang_oto))
        if misi["status"] != "batal":
            sibuk.add(d["id"])
    for d in armada["dock"]:
        if d["id"] not in sibuk and d["id"] not in patroli_aktif:
            m = patroli(d, armada, riwayat + baru, kini, cuaca_fn, folder, dc_grid, stasiun)
            if m:
                baru.append(m)
    riwayat.extend(baru)
    return baru


def rute_patroli(d, kering):
    """Stasiun TMAT kering dalam jangkauan, urut tetangga terdekat dari dock, ditambah selama baterai cukup.
    Tanpa stasiun: cincin PATROLI['titik'] titik radius PATROLI['cincin_m'] mengelilingi dock."""
    sisa = [(s["lat"], s["lon"]) for s in kering if km(d["lat"], d["lon"], s["lat"], s["lon"]) <= d.get("radius_km", 6)]
    if not sisa:
        return [geser(d["lat"], d["lon"], 360.0 * i / PATROLI["titik"], PATROLI["cincin_m"]) for i in range(PATROLI["titik"])]
    pts, kini = [], (d["lat"], d["lon"])
    while sisa:
        t = min(sisa, key=lambda p: km(*kini, *p))
        if anggaran(d, pts + [t])[1] > MISI["baterai_menit"]:
            break
        pts.append(t); sisa.remove(t); kini = t
    return pts


def patroli(d, armada, riwayat, kini, cuaca_fn, folder, dc_grid, stasiun):
    """Satu misi patroli pencegahan untuk dock d bila areanya kering dan jatah hari ini belum habis; None bila tidak perlu."""
    hari = kini.astimezone(WIB).date()
    mine = [m for m in riwayat if m.get("jenis") == "patroli" and m["dock"] == d["id"] and m["status"] != "batal"]
    if (sum(dt.datetime.fromisoformat(m["dibuat"]).astimezone(WIB).date() == hari for m in mine) >= armada.get("patroli_per_hari", PATROLI["per_dock_hari"])
            or any(dt.datetime.fromisoformat(m["dibuat"]) >= kini - dt.timedelta(hours=PATROLI["jeda_jam"]) for m in mine)):
        return None
    dalam = [s for s in stasiun if km(d["lat"], d["lon"], s["lat"], s["lon"]) <= d.get("radius_km", 6)]
    kering = [s for s in dalam if s["tmat_cm"] < GAMBUT["tmat_kering_cm"]]
    dc = dc_di(dc_grid, d["lat"], d["lon"])
    if not kering and not (dc is not None and dc > GAMBUT["dc_kering"]):
        return None
    c = cuaca_fn(d["lat"], d["lon"])
    if layak_terbang(c) or c["hujan_3j_mm"] >= CUACA["padam_hujan_3j_mm"]:
        return None                                       # patroli tidak dicatat batal: tidak ada api yang menunggu
    pts = rute_patroli(d, kering)
    if not pts:
        return None
    j, menit = anggaran(d, pts)
    mid = hashlib.sha1(f"patroli|{d['id']}|{kini.isoformat()}".encode()).hexdigest()[:16]
    berkas = kmz(d, pts, armada, f"patroli {d['id']} {kini.astimezone(WIB):%d-%m %H.%M}")
    misi = {"id": mid, "jenis": "patroli", "dibuat": kini.isoformat(), "dock": d["id"], "lat": pts[0][0], "lon": pts[0][1],
            "titik": len(pts), "stasiun_kering": [s["stasiun"] for s in kering], "dc": dc, "jalur_km": j, "menit": menit,
            "rh": c["rh"], "alasan_tunda": [] if menit <= MISI["baterai_menit"] else ["butuh %.0f menit > baterai %d menit" % (menit, MISI["baterai_menit"])],
            "mqtt": pesan_mqtt(mid, d["sn"], berkas, kini)}
    return simpan_misi(misi, berkas, armada, folder, True)


def setujui(mid, armada, riwayat, folder):
    m = next((x for x in riwayat if x["id"] == mid), None)
    if not m or m["status"] != "menunggu":
        raise SystemExit("misi %s tidak ada atau bukan 'menunggu'" % mid)
    if dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(m["dibuat"]) > dt.timedelta(minutes=30):
        raise SystemExit("misi %s lebih tua dari 30 menit: api dan cuaca sudah berubah, tunggu putaran berikutnya" % mid)
    m["status"] = kirim(m, open(os.path.join(folder, "misi", mid + ".kmz"), "rb").read(), armada)
    m["disetujui"] = dt.datetime.now(dt.timezone.utc).isoformat()
    return m


# ================================================================ ukuran armada
def ukur(luas_km2, radius_km, faktor_tepi=1.2, jam_terang=11, menit_terbang=25, menit_isi=27):
    """Dock yang dibutuhkan untuk menutup luas_km2 (heksagon, radius kerja radius_km) dan sortie per dock per hari.
    faktor_tepi 1,2: wilayah nyata tidak berbentuk sarang lebah, tepinya butuh dock tambahan."""
    per = 1.5 * math.sqrt(3) * radius_km ** 2
    return {"km2_per_dock": round(per, 1), "dock": math.ceil(luas_km2 * faktor_tepi / per),
            "sortie_per_dock_hari": int(jam_terang * 60 // (menit_terbang + menit_isi)),
            "menit_tiba_terjauh": round(radius_km * 1000 / MISI["laju_ms"] / 60 + 1, 1)}


# ================================================================ self-check
def uji():
    kini = dt.datetime(2026, 10, 22, 4, 0, tzinfo=dt.timezone.utc)
    assert abs(km(-2.2, 113.9, -2.2, 114.0) - 11.1) < 0.1
    la, lo = geser(-2.2, 113.9, 90, 150)
    assert abs(km(-2.2, 113.9, la, lo) * 1000 - 150) < 1
    kol = ["lat", "lon", "u", "frp", "level", "rel", "qf", "n", "u0", "baru", "w"]
    hw = {"kolom": kol, "wilayah": ["62|Pulang Pisau|Jabiren Raya"], "baris": [
        [-2.50, 114.20, 10, 180.0, 3, 3, 0, 5, 40, 1, 0],    # besar, baru, menyala: kirim
        [-2.51, 114.21, 10, 150.0, 3, 3, 0, 5, 40, 1, 0],    # 1,5 km dari yang pertama: tidak dua kali
        [-2.60, 114.30, 10, 20.0, 2, 3, 0, 4, 40, 0, 0],     # kecil (< 30 MW): lewati
        [-2.45, 114.25, 10, 60.0, 2, 3, 0, 2, 10, 1, 0],     # sekilas (2 pindaian): lewati
        [-2.55, 114.15, 10, 90.0, 2, 3, 0, 4, 40, 0, 0],     # sedang, skor 28 + cuaca maks 15 < 50: lewati
        [-2.70, 114.40, 90, 300.0, 3, 3, 0, 6, 120, 1, 0],   # terlihat 90 menit lalu: basi
        [-2.40, 114.10, 5, 400.0, 1, 3, 0, 6, 60, 0, 0],     # level 1: dingin
        [-1.00, 112.00, 5, 250.0, 3, 3, 0, 6, 60, 1, 0]]}    # di luar jangkauan dock mana pun
    k = kandidat(hw)
    assert [round(a["lat"], 2) for a in k] == [-1.0, -2.5, -2.51, -2.55], k
    assert k[1]["wilayah"] == "62|Pulang Pisau|Jabiren Raya"
    assert skor({"frp": 300, "n": 6, "baru": 1, "level": 3}) == 100 and skor({"frp": 0, "n": 0, "baru": 0, "level": 2}) == 0
    try:
        kandidat({"kolom": ["lat", "lon"], "baris": []}); raise AssertionError("kolom hilang harus gagal")
    except ValueError:
        pass
    armada = {"dock": [{"id": "PPS-1", "sn": "SNUJI", "lat": -2.48, "lon": 114.18, "radius_km": 6}],
              "drone_enum": 100, "drone_sub_enum": 1, "payload_enum": 99, "mode": "usul"}
    cuaca_uji = lambda **x: (lambda la, lo: dict({"angin_ms": 3, "hembus_ms": 5, "hujan_mm": 0, "terang": True, "rh": 70, "hujan_3j_mm": 0}, **x))
    cerah = cuaca_uji()
    import tempfile
    with tempfile.TemporaryDirectory() as f:
        r = []
        m = putaran(hw, armada, r, kini, cerah, f)
        assert len(m) == 1 and m[0]["status"] == "menunggu" and m[0]["dock"] == "PPS-1", m
        assert m[0]["menit"] <= MISI["baterai_menit"]
        z = zipfile.ZipFile(os.path.join(f, "misi", m[0]["id"] + ".kmz"))
        assert sorted(z.namelist()) == ["wpmz/template.kml", "wpmz/waylines.wpml"]
        import xml.dom.minidom
        w = xml.dom.minidom.parseString(z.read("wpmz/waylines.wpml"))
        assert len(w.getElementsByTagName("Placemark")) == MISI["titik"] + 1
        assert w.getElementsByTagName("wpml:executeHeight")[0].firstChild.data == str(MISI["tinggi_m"])
        p = m[0]["mqtt"]
        assert p["topik"] == "thing/product/SNUJI/services" and [x["method"] for x in p["pesan"]] == ["flighttask_prepare", "flighttask_execute"]
        assert p["pesan"][0]["data"]["file"]["fingerprint"] == hashlib.md5(z.fp.getvalue() if hasattr(z.fp, "getvalue") else open(z.filename, "rb").read()).hexdigest()
        assert putaran(hw, armada, r, kini + dt.timedelta(minutes=20), cerah, f) == [], "api yang sama tidak boleh dikirimi lagi"
        r2 = []
        angin = cuaca_uji(angin_ms=9, hembus_ms=14)
        m2 = putaran(hw, armada, r2, kini, angin, f)
        assert m2[0]["status"] == "batal" and "hembusan" in m2[0]["alasan_tunda"][0]
        m3 = putaran(hw, armada, r2, kini + dt.timedelta(minutes=10), cerah, f)
        assert len(m3) == 1 and m3[0]["status"] == "menunggu", "misi batal karena angin boleh dicoba lagi"
        assert m2[0]["skor"] == m[0]["skor"] + 5, "angin >= 4 m/s menambah 5"
        assert "jam terang" in putaran(hw, armada, [], kini, cuaca_uji(terang=False), f)[0]["alasan_tunda"][0]
        assert putaran(hw, armada, [], kini, cuaca_uji(hujan_3j_mm=8.0), f) == [], "hujan lebat 3 jam ke depan: biarkan padam sendiri"
        kering = putaran(hw, armada, [], kini, cuaca_uji(rh=45), f)
        assert kering[0]["skor"] == m[0]["skor"] + 10
        jauh = dict(armada, dock=[dict(armada["dock"][0], radius_km=20, lat=-2.40, lon=114.13)])
        assert "baterai" in putaran(hw, jauh, [], kini, cerah, f)[0]["alasan_tunda"][0]
        sedang = {"kolom": kol, "wilayah": [], "baris": [[-2.50, 114.20, 10, 60.0, 2, 3, 0, 3, 30, 0, 0]]}
        assert putaran(sedang, armada, [], kini, cuaca_uji(rh=40, angin_ms=6), f) == [], "api sedang tanpa tanda membesar: tidak dikirim"
        tulis_riwayat(f, r); assert baca_riwayat(f)[0]["id"] == r[0]["id"]
    uji_gambut(kini, kol, armada, cuaca_uji)
    u = ukur(1000, 6)
    assert u["km2_per_dock"] == 93.5 and u["dock"] == 13 and u["sortie_per_dock_hari"] == 12
    print("drone.py self-check OK")


def uji_gambut(kini, kol, armada, cuaca_uji):
    import tempfile
    sel = lambda dc: [(-2.5, 114.0, dc)]                  # sel 0,5 derajat yang memuat api uji dan dock PPS-1
    assert dc_di(sel(400), -2.40, 114.20) == 400 and dc_di(sel(400), -2.80, 114.20) is None
    assert muat_dc({"hari_ini": "2026-10-22", "grid": [{"lat": -2.5, "lon": 114.0, "hari": [{"tgl": "2026-10-21", "dc": 1}, {"tgl": "2026-10-22", "dc": 691.0}]}]}) == [(-2.5, 114.0, 691.0)]
    st = lambda cm, jam=2, la=-2.49, lo=114.19, n="TM1": {"stasiun": n, "lat": la, "lon": lo, "tmat_cm": cm, "waktu": kini - dt.timedelta(hours=jam)}
    hw = {"kolom": kol, "wilayah": [], "baris": [[-2.50, 114.20, 10, 180.0, 3, 3, 0, 5, 40, 1, 0]]}
    b = skor({"frp": 180.0, "n": 5, "baru": 1, "level": 3})   # 76,7 sebelum cuaca dan gambut
    hujan = cuaca_uji(hujan_3j_mm=8.0)
    with tempfile.TemporaryDirectory() as f:
        jalan = lambda dc=(), s=(), cu=hujan, h=hw, ar=armada, t=kini: putaran(h, ar, [], t, cu, f, dc, s)
        assert jalan() == [], "tanpa data gambut: hujan saja (hipotesis lama)"
        m = jalan(sel(400))
        assert len(m) == 1 and m[0]["skor"] == round(b + 10, 1) and m[0]["dc"] == 400, "DC > 350: hujan tidak memadamkan, +10"
        assert jalan(sel(200)) == [], "DC < 261 tanpa TMAT: gambut basah, hujan memadamkan"
        assert len(jalan(sel(300))) == 1, "DC 261-350 tanpa TMAT: ragu, tetap dikirim"
        assert jalan(sel(200), [st(-20)]) == [], "TMAT 20 cm + DC < 261: basah"
        m = jalan(sel(200), [st(-60)])
        assert len(m) == 1 and m[0]["skor"] == round(b + 10, 1) and m[0]["tmat_stasiun"] == "TM1", "TMAT 60 cm: kering, +10"
        assert len(jalan(sel(300), [st(-20)])) == 1, "TMAT dangkal tapi DC 261-350: belum basah"
        assert jalan(sel(200), [st(-60, jam=100)]) == [], "TMAT lebih tua dari 72 jam diabaikan"
        assert jalan(sel(200), [st(-60, la=-2.70)]) == [], "stasiun > 10 km diabaikan"
        m = jalan(sel(400), [st(-60)], cuaca_uji(rh=40, angin_ms=5))
        assert m[0]["skor"] == round(b + 15 + 20, 1), "cuaca 15 + gambut 20"
        # patroli: tanpa api, area kering
        kosong = {"kolom": kol, "wilayah": [], "baris": []}
        r = []
        p1 = putaran(kosong, armada, r, kini, cuaca_uji(), f, sel(400))
        assert len(p1) == 1 and p1[0]["jenis"] == "patroli" and p1[0]["titik"] == PATROLI["titik"] and p1[0]["status"] == "menunggu", p1
        assert p1[0]["menit"] <= MISI["baterai_menit"]
        import xml.dom.minidom
        w = xml.dom.minidom.parseString(zipfile.ZipFile(os.path.join(f, "misi", p1[0]["id"] + ".kmz")).read("wpmz/waylines.wpml"))
        assert {x.firstChild.data for x in w.getElementsByTagName("wpml:gimbalPitchRotateAngle")} == {"-90"}, "patroli: tegak lurus"
        assert putaran(kosong, armada, r, kini + dt.timedelta(hours=1), cuaca_uji(), f, sel(400)) == [], "jeda 3 jam"
        assert len(putaran(kosong, armada, r, kini + dt.timedelta(hours=4), cuaca_uji(), f, sel(400))) == 1
        assert putaran(kosong, armada, r, kini + dt.timedelta(hours=8), cuaca_uji(), f, sel(400)) == [], "jatah 2 per hari WIB"
        assert putaran(kosong, armada, [], kini, cuaca_uji(), f, sel(300)) == [], "area tidak kering: tidak patroli"
        assert putaran(kosong, armada, [], kini, cuaca_uji(hujan_3j_mm=8), f, sel(400)) == [], "akan hujan: tidak patroli"
        assert putaran(kosong, armada, [], kini, cuaca_uji(terang=False), f, sel(400)) == [], "malam: tidak patroli, tidak dicatat"
        # patroli lewat stasiun TMAT kering, stasiun basah dan di luar jangkauan dilewati
        sts = [st(-70, n="A", la=-2.46, lo=114.16), st(-55, n="B", la=-2.44, lo=114.20), st(-10, n="BASAH", la=-2.47, lo=114.17),
               st(-90, n="JAUH", la=-2.80, lo=114.18)]
        p = putaran(kosong, armada, [], kini, cuaca_uji(), f, sel(200), sts)
        assert p[0]["stasiun_kering"] == ["A", "B"] and p[0]["titik"] == 2 and (p[0]["lat"], p[0]["lon"]) == (-2.46, 114.16), p
        # api muncul saat patroli aktif: misi api tetap jalan dan meminta patroli dihentikan
        r = []
        p = putaran(kosong, armada, r, kini, cuaca_uji(), f, sel(400))
        m = putaran(hw, armada, r, kini + dt.timedelta(minutes=10), cuaca_uji(), f, sel(400))
        assert len(m) == 1 and m[0]["jenis"] == "api" and m[0]["hentikan"] == p[0]["id"], m
        assert not sudah_dikirim({"lat": p[0]["lat"], "lon": p[0]["lon"]}, p, kini), "patroli bukan 'api yang sama'"
    with tempfile.TemporaryDirectory() as f:
        open(os.path.join(f, "t.csv"), "w").write("id,lat,lon,tmat_cm,waktu,sumber\nX,-2.4,114.1,-35,2026-10-21T08:00:00,BRGM\nX,-2.4,114.1,-52,2026-10-22T08:00:00,BRGM\n")
        t = muat_tmat(os.path.join(f, "t.csv"))
        assert len(t) == 1 and t[0]["tmat_cm"] == -52 and t[0]["waktu"] == dt.datetime(2026, 10, 22, 1, tzinfo=dt.timezone.utc), "CSV: terakhir per stasiun, waktu tanpa zona = WIB"
        json.dump({"stasiun": [{"stasiun": "Y", "lat": -2.4, "lon": 114.1, "tmat_cm": -45, "waktu": 1792627200000}]}, open(os.path.join(f, "t.json"), "w"))
        assert muat_tmat(os.path.join(f, "t.json"))[0]["waktu"].year == 2026


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--armada"); ap.add_argument("--setujui"); ap.add_argument("--sumber", default=SUMBER); ap.add_argument("--fwi", default=FWI)
    ap.add_argument("--keadaan", default=KEADAAN); ap.add_argument("--ukur", type=float); ap.add_argument("--radius", type=float, default=6)
    ap.add_argument("--uji", action="store_true")
    a = ap.parse_args()
    if a.uji:
        return uji()
    if a.ukur:
        return print(json.dumps(ukur(a.ukur, a.radius), indent=1))
    if not a.armada:
        ap.error("--armada wajib")
    armada = json.load(open(a.armada))
    riwayat = baca_riwayat(a.keadaan)
    if a.setujui:
        m = setujui(a.setujui, armada, riwayat, a.keadaan)
        tulis_riwayat(a.keadaan, riwayat)
        return print(json.dumps({k: m[k] for k in ("id", "dock", "status")}))
    hw = ambil(a.sumber)
    try:
        dc_grid = muat_dc(ambil(a.fwi))
    except Exception as e:                                # DC hilang tidak menghentikan misi api; gerbang kembali ke hujan saja
        print("DC tidak terbaca (%s): gerbang padam sendiri memakai hujan dan TMAT saja" % e, file=sys.stderr)
        dc_grid = []
    stasiun = muat_tmat(armada.get("tmat"))
    baru = putaran(hw, armada, riwayat, dt.datetime.now(dt.timezone.utc), cuaca, a.keadaan, dc_grid, stasiun)
    tulis_riwayat(a.keadaan, riwayat)
    for m in baru:
        isi = (f"api {m['lat']:.3f},{m['lon']:.3f} skor {m['skor']} {m['jarak_dock_km']} km DC {m['dc']} TMAT {m['tmat_cm']}" if m["jenis"] == "api"
               else f"patroli {m['titik']} titik DC {m['dc']} stasiun kering {len(m['stasiun_kering'])}")
        print(f"{m['status']:<9} {m['id']} dock {m['dock']} {isi} {m['menit']} menit {'; '.join(m['alasan_tunda'])}")
    if not baru:
        print("tidak ada api yang perlu drone di jangkauan dock")


if __name__ == "__main__":
    sys.exit(main())
