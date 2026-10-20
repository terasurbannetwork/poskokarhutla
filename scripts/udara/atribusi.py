"""Atribusi sumber PM2,5 per kab/kota: api (kompleks aktif) vs PLTU vs latar -> atribusi.json + prakiraan.json kota[].asap

Model  : plume Gauss tunak per jam per sumber (garis lurus searah angin transport = rata-rata 10 m dan 925 hPa di sumber),
         sigma Briggs (1973) pedesaan, kelas Pasquill dari kecepatan angin 10 m + siang/malam (jam surya lokal),
         tinggi campuran = boundary_layer_height di sumber (dengan lantai); sigma_z >= 0,8 H -> tercampur rata dalam H.
         Jarak maks 600 km; tanpa waktu tempuh, deposisi, kimia sekunder. ponytail: plume tunak, ganti puff/lintasan bila perlu.
Hari   : atribusi utama = BESOK (hari WIB penuh di jendela 72 jam). Tiap hari model dibandingkan dengan rata-rata CAMS
         di jam yang SAMA (hari ini hanya jam tersisa), bukan r24 seharian.
Bagian : persen = model_i / maks(CAMS, total model); latar = sisa CAMS di atas total model (min 0).
         Kota dengan total model > 1,5 x CAMS ditandai terpercaya=false dan TIDAK diberi persen per sumber.
         rendah/tinggi = min/maks dari 27 varian sebaran (lantai tinggi campuran, sebaran samping, arah angin +-20 derajat)
         x 27 varian emisi (EF api, lintasan satelit, emisi PLTU) x 2 normalisasi (ke CAMS, ke total model) = 1.458 kombinasi.
Semua asumsi bernama + sumber: ASUMSI di bawah, ditulis ke atribusi.asumsi.
"""
import datetime as dt
import itertools
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import lintasan

MAKS_API = 300
JARAK_MAKS = 600_000
H_MIN = 300.0                       # m, tinggi campuran minimum (asap api terangkat di atas lapisan batas malam yang tipis)
MEANDER = 0.1                       # sigma_y minimum = 0,1 x jarak (arah angin berkelok dalam satu jam)
H_MIN_V = (150.0, 300.0, 600.0)     # varian sensitivitas
MEANDER_V = (0.05, 0.1, 0.2)
ROT_V = (-20, 0, 20)                # derajat, galat arah angin model
DISP = list(itertools.product(range(3), repeat=3))
EMIS = list(itertools.product(range(3), repeat=3))
NORM = ("cams", "model")
TD, TE = DISP.index((1, 1, 1)), EMIS.index((1, 1, 1))
HARI_ATRIBUSI = 1
BATAS_PERCAYA = 1.5
MIN_PERSEN = .5
H_PLTU = 200
DM_PER_MJ = 0.368
EF_GAMBUT = (11.3, 17.3, 23.3)     # g PM2,5 / kg bahan kering: rendah, tengah, tinggi
EF_HUTAN = (7.6, 9.1, 10.6)
LINTAS = (6, 4, 2)                  # lintasan satelit yang melihat api per hari (rendah emisi = banyak lintasan)
EF_PLTU = (0.05, 0.15, 0.35)        # kg PM2,5 / MWh
FK_SKALA = (0.8, 1.0, 1.2)
ASUMSI = [
    {"nama": "Bahan bakar terbakar per energi radiatif api", "nilai": "0,368 kg/MJ",
     "sumber": "Wooster et al. 2005, J. Geophys. Res. 110:D24311"},
    {"nama": "Daya api rata-rata 24 jam", "nilai": "jumlah FRP 24 jam kompleks dibagi 6 / 4 / 2 lintasan satelit yang melihat api (rendah/tengah/tinggi)",
     "sumber": "asumsi; VIIRS S-NPP, NOAA-20, NOAA-21 masing-masing 2 lintasan/hari (NASA FIRMS); awan dan asap menutup sebagian"},
    {"nama": "Bias FRP rata-rata harian", "nilai": "cenderung TINGGI: lintasan VIIRS sekitar 01.30 dan 13.30 waktu lokal, dan 13.30 dekat puncak siang siklus api; rata-rata dari lintasan itu melebihi rata-rata 24 jam",
     "sumber": "asumsi tidak dikoreksi; orbit VIIRS (NASA FIRMS)"},
    {"nama": "Faktor emisi PM2,5 kebakaran gambut", "nilai": "17,3 +- 6,0 g/kg (1 SD; rentang ukur 6,0-29,6); varian 11,3 / 17,3 / 23,3",
     "sumber": "Jayarathne et al. 2018, Atmos. Chem. Phys. 18:2585 (gambut Kalimantan Tengah)"},
    {"nama": "Faktor emisi PM2,5 kebakaran hutan/vegetasi tropis", "nilai": "9,1 g/kg (rentang 7,6-10,6)",
     "sumber": "Andreae & Merlet 2001, Global Biogeochem. Cycles 15:955 (hutan tropis)"},
    {"nama": "Catatan FRP gambut", "nilai": "metode FRP cenderung terlalu rendah untuk bara gambut yang membara di bawah permukaan",
     "sumber": "Wooster et al. 2005; asumsi tidak dikoreksi"},
    {"nama": "Faktor emisi PM2,5 PLTU batu bara", "nilai": "0,15 kg/MWh (rentang 0,05 ESP efektif - 0,35 pada baku mutu 100 mg/Nm3 x ~3.500 Nm3/MWh)",
     "sumber": "Permen LHK P.15/2019 (baku mutu emisi pembangkit termal); asumsi seluruh partikulat PM2,5 pada batas atas"},
    {"nama": "Faktor kapasitas PLTU", "nilai": "estimasi produksi 2017 per pembangkit (median bila kosong) x 0,8 / 1,0 / 1,2",
     "sumber": "WRI Global Power Plant Database v1.3 estimated_generation_gwh_2017"},
    {"nama": "Tinggi lepas PLTU efektif", "nilai": "200 m; api di permukaan (0 m)", "sumber": "asumsi"},
    {"nama": "Batas bawah penyebaran", "nilai": "tinggi campuran min 300 m (varian 150/600); sigma_y min 0,1 x jarak (varian 0,05/0,2); angin min 1 m/s; arah angin varian +-20 derajat",
     "sumber": "asumsi: lapisan batas malam model bisa < 50 m dan sigma Briggs hanya sahih sampai ~10 km; tanpa batas ini konsentrasi malam meledak tak wajar"},
    {"nama": "Penyebaran", "nilai": "plume Gauss tunak per jam, sigma Briggs pedesaan, kelas Pasquill dari angin 10 m + siang/malam, tercampur dalam tinggi lapisan batas, maks 600 km",
     "sumber": "Briggs 1973 (ATDL 1973/1); Turner 1970 Workbook of Atmospheric Dispersion Estimates"},
    {"nama": "Latar", "nilai": "rata-rata CAMS di jam yang sama dikurangi total model, minimal 0 (sumber lain: kendaraan, industri, asap jauh, sekunder)",
     "sumber": "CAMS (Copernicus) via Open-Meteo"},
    {"nama": "Hari atribusi", "nilai": "besok (hari WIB penuh); hari ini hanya jam tersisa, dibandingkan CAMS di jam yang sama untuk porsi asap",
     "sumber": "pilihan metode: model tak punya jam lampau hari ini"},
    {"nama": "Kepercayaan", "nilai": "total model > 1,5× CAMS: porsi per sumber tidak diterbitkan (terpercaya=false); porsi asap harian juga null",
     "sumber": "asumsi; CAMS sebagai jangkar karena terasimilasi AOD satelit"},
    {"nama": "Rentang", "nilai": "min-maks dari 1.458 kombinasi: 27 varian sebaran x 27 varian emisi x 2 normalisasi (ke CAMS / ke total model)",
     "sumber": "uji sensitivitas, bukan selang statistik"},
]
BRIGGS = {  # kelas: (ay, az, bz, pz) sigma_y = ay x (1+1e-4x)^-.5 ; sigma_z = az x (1+bz x)^pz
    "A": (.22, .20, 0, 0), "B": (.16, .12, 0, 0), "C": (.11, .08, 2e-4, -.5),
    "D": (.08, .06, 1.5e-3, -.5), "E": (.06, .03, 3e-4, -1), "F": (.04, .016, 3e-4, -1)}


def kelas(u10, jam_surya):
    """Kelas Pasquill. Siang 10-14 terik, 8-10/14-16 sedang, 6-8/16-18 lemah; malam diasumsikan berawan >= 4/8."""
    if u10 is None or u10 < 0:
        raise ValueError(f"angin 10 m tidak sah: {u10}")
    b = 0 if u10 < 2 else 1 if u10 < 3 else 2 if u10 < 5 else 3 if u10 < 6 else 4
    h = jam_surya % 24
    if 10 <= h < 14:
        return "AABCC"[b]
    if 8 <= h < 16:
        return "ABBCD"[b]
    if 6 <= h < 18:
        return "BCCDD"[b]
    return "FEDDD"[b]


def sigma(k, x):
    ay, az, bz, pz = BRIGGS[k]
    return ay * x / math.sqrt(1 + 1e-4 * x), az * x * (1 + bz * x) ** pz if bz else az * x


def konsentrasi(Q, dx, dy, u, v, k, H, hs=0.0, h_min=H_MIN, meander=MEANDER):
    """ug/m3 di permukaan dari sumber Q g/s, penerima di (dx, dy) m dari sumber, angin (u, v) m/s."""
    if Q < 0 or H is None:
        raise ValueError(f"Q={Q} H={H}")
    ws = max(math.hypot(u, v), 1.0)
    x = (dx * u + dy * v) / ws
    if x < 500 or x > JARAK_MAKS:
        return 0.0
    H = max(H, h_min)
    if hs > H:
        return 0.0
    y = (-dx * v + dy * u) / ws
    sy, sz = sigma(k, x)
    sy = max(sy, meander * x)
    ey = math.exp(-y * y / (2 * sy * sy))
    if ey < 1e-12:
        return 0.0
    if sz >= .8 * H:
        return 1e6 * Q / (math.sqrt(2 * math.pi) * sy * ws * H) * ey
    return 1e6 * Q / (2 * math.pi * sy * sz * ws) * ey * 2 * math.exp(-hs * hs / (2 * sz * sz))


def blh_di(A, lon, lat, jam):
    j = min(max(round(lat - A["lat"][0]), 0), len(A["lat"]) - 1)
    i = min(max(round(lon - A["lon"][0]), 0), len(A["lon"]) - 1)
    t = min(max(round(jam / 3), 0), len(A["jam"]) - 1)
    return A["blh"][t][j][i] if A.get("blh") else None


def cuaca_sumber(A, lon, lat, jam_ke, t0):
    """Per jam: (u, v, kelas, H) di sumber; None bila angin tak ada."""
    out = []
    j0 = (t0 - alat.dari_iso(A["jam"][0])).total_seconds() / 3600
    for h in jam_ke:
        a10 = lintasan.angin_di(A, 0, lon, lat, j0 + h)
        a92 = lintasan.angin_di(A, 1, lon, lat, j0 + h)
        if a10 is None or a92 is None:
            out.append(None)
            continue
        jam_surya = (t0.hour + h + lon / 15) % 24
        b = blh_di(A, lon, lat, j0 + h)
        out.append(((a10[0] + a92[0]) / 2, (a10[1] + a92[1]) / 2, kelas(math.hypot(*a10), jam_surya), 800.0 if b is None else float(b)))
    return out


def sumber_list(kluster, pltu, t, tk):
    src = []
    for f in lintasan.aktif(kluster, t, MAKS_API):
        p = f["properties"]
        ef = EF_GAMBUT if p.get("gambut") else EF_HUTAN
        # emisi per kombinasi = frp24 / lintas * 0,368 * ef  (g/s)
        src.append({"jenis": "api", "id": p["id"], "nama": f"Kompleks api {p.get('kab') or ''} {p['id']}".replace('  ', ' '), "lon": p["lon"], "lat": p["lat"],
                    "hs": 0.0, "basis": (p.get("frp24") or 0) * DM_PER_MJ, "ef": ef, "konsesi": lintasan.konsesi_untuk(f, tk), "prov": p.get("prov")})
    fks = sorted(x["fk"] for x in pltu if x.get("fk"))
    fk_med = fks[len(fks) // 2] if fks else .6
    for x in pltu:
        src.append({"jenis": "pltu", "id": x["id"], "nama": x["nama"], "lon": x["lon"], "lat": x["lat"], "hs": float(H_PLTU),
                    "basis": x["mw"] * (x.get("fk") or fk_med) * 1000 / 3600, "konsesi": []})
    return src


def skala(s, kombi):
    """Pengali emisi (g/s per satuan unit) untuk kombinasi (i_ef, i_lintas, i_pltu)."""
    a, b, c = kombi
    if s["jenis"] == "api":
        return s["basis"] / LINTAS[b] * s["ef"][a]
    return s["basis"] * EF_PLTU[c] * FK_SKALA[c]


def putar(u, v, derajat):
    r = math.radians(derajat)
    return u * math.cos(r) - v * math.sin(r), u * math.sin(r) + v * math.cos(r)


def unit_kota(k, src, hari_jam):
    """[(sumber, [[rata unit per hari] per varian DISP])] untuk sumber yang menyumbang di salah satu varian."""
    c = math.cos(math.radians(k["lat"]))
    out = []
    for s in src:
        dx, dy = (k["lon"] - s["lon"]) * 111320 * c, (k["lat"] - s["lat"]) * 110540
        if dx * dx + dy * dy > JARAK_MAKS ** 2:
            continue
        per = []
        for ih, im, ir in DISP:
            cu = s["cuaca_rot"][ir]
            hr = []
            for jj in hari_jam:
                tot, n = 0.0, 0
                for i in jj:
                    w = cu[i]
                    if w is None:
                        continue
                    tot += konsentrasi(1.0, dx, dy, w[0], w[1], w[2], w[3], s["hs"], H_MIN_V[ih], MEANDER_V[im])
                    n += 1
                hr.append(tot / n if n else 0.0)
            per.append(hr)
        if any(any(h) for h in per):
            out.append((s, per))
    return out


def rentang(unit, C, d):
    """-> ({sid: [persen per skenario]}, [latar per skenario]) atas DISP x EMIS x NORM untuk hari d.

    Sumber yang tak pernah >= MIN_PERSEN dibuang. Deret per skenario disimpan supaya gabungan ("lain") dijumlahkan
    PER SKENARIO lalu diambil min/maks, bukan menjumlah batas (yang bisa melebihi 100%).
    """
    sk = [[skala(s, e) for e in EMIS] for s, _ in unit]
    seri = [[] for _ in unit]
    lat = []
    for di in range(len(DISP)):
        u = [pv[di][d] for _, pv in unit]
        for ei in range(len(EMIS)):
            m = [ui * sk[j][ei] for j, ui in enumerate(u)]
            M = sum(m)
            for norm in NORM:
                T = max(C, M) if norm == "cams" else M
                if T <= 0:
                    continue
                for j, v in enumerate(m):
                    seri[j].append(100 * v / T)
                lat.append(100 * max(0.0, C - M) / T if norm == "cams" else 0.0)
    return {unit[j][0]["id"]: x for j, x in enumerate(seri) if x and max(x) >= MIN_PERSEN}, lat


def hitung(kota, prak, A, src, t0):
    """-> (baris atribusi hari HARI_ATRIBUSI, asap {kode: [3]})"""
    jam = [alat.dari_iso(j) for j in prak["jam"]]
    jam_ke = [(j - t0).total_seconds() / 3600 for j in jam]
    hari_jam = [[i for i, j in enumerate(jam) if alat.hari_wib(j) == d] for d in prak["hari"]]
    for s in src:
        cu = cuaca_sumber(A, s["lon"], s["lat"], jam_ke, t0)
        s["cuaca_rot"] = [[None if w is None else (*putar(w[0], w[1], r), w[2], w[3]) for w in cu] for r in ROT_V]
    pm = {k["kode"]: k for k in prak["kota"]}
    baris, asap = [], {}
    for k in kota:
        kp = pm.get(k["kode"])
        if not kp:
            continue
        unit = unit_kota(k, src, hari_jam)
        cams = []
        for jj in hari_jam:   # CAMS di jam yang sama dengan model
            v = [kp["pm"][i] for i in jj if kp["pm"][i] is not None]
            cams.append(sum(v) / len(v) if v else None)
        model = [sum(skala(s, EMIS[TE]) * pv[TD][d] for s, pv in unit) for d in range(len(hari_jam))]
        api = [sum(skala(s, EMIS[TE]) * pv[TD][d] for s, pv in unit if s["jenis"] == "api") for d in range(len(hari_jam))]
        asap[k["kode"]] = [None if C is None or M > BATAS_PERCAYA * C else (round(a / max(C, M), 2) if max(C, M) > 0 else 0.0)
                           for C, M, a in zip(cams, model, api)]
        d = HARI_ATRIBUSI
        C = cams[d]
        if C is None or not unit:
            continue
        o = {"kode": k["kode"], "nama": k["nama"], "prov": k["prov"], "pm": round(C), "model": round(model[d]),
             "terpercaya": model[d] <= BATAS_PERCAYA * C}
        if not o["terpercaya"]:
            o["bagian"] = []
            o["alasan"] = f"Model plume {round(model[d])} µg/m³ melebihi 1,5× CAMS {round(C)} µg/m³; porsi per sumber tidak diterbitkan."
            baris.append(o)
            continue
        sr, lat = rentang(unit, C, d)
        tengah = {s["id"]: 100 * skala(s, EMIS[TE]) * pv[TD][d] / max(C, model[d]) for s, pv in unit}
        bag = [{"jenis": s["jenis"], "id": s["id"], "nama": s["nama"], "konsesi": s["konsesi"], "persen": round(tengah[s["id"]]),
                "rendah": round(min(sr[s["id"]])), "tinggi": round(max(sr[s["id"]]))} for s, _ in unit if s["id"] in sr]
        bag.sort(key=lambda b: -b["persen"])
        utama, sisa = bag[:6], bag[6:]
        if sisa:
            jml = [sum(x) for x in zip(*(sr[b["id"]] for b in sisa))]   # jumlah per skenario
            utama.append({"jenis": "lain", "id": "lain", "nama": f"{len(sisa)} sumber lain dimodelkan", "konsesi": [],
                          "persen": round(sum(tengah[b["id"]] for b in sisa)), "rendah": round(min(jml)), "tinggi": round(max(jml))})
        utama.append({"jenis": "latar", "id": "latar", "nama": "Latar (sumber lain, CAMS)", "konsesi": [],
                      "persen": round(100 * max(0.0, C - model[d]) / max(C, model[d])), "rendah": round(min(lat)), "tinggi": round(max(lat))})
        o["bagian"] = utama
        baris.append(o)
    return baris, asap


def main():
    t = alat.sekarang()
    prak = alat.keluaran("prakiraan.json")
    A = alat.keluaran("angin.json")
    src = sumber_list(alat.data("kluster.json"), alat.keluaran("pltu.json"), t, lintasan.titik_konsesi())
    t0 = alat.dari_iso(prak["jam"][0])
    baris, asap = hitung(alat.kota(), prak, A, src, t0)
    simpan = [b for b in baris if not b["terpercaya"] or b["pm"] > 55.4 or any(x["jenis"] not in ("latar",) and x["persen"] >= 1 for x in b["bagian"])]
    lebar = [x["tinggi"] - x["rendah"] for b in simpan for x in b["bagian"] if x["jenis"] in ("api", "pltu")]
    d = {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "hari": prak["hari"][HARI_ATRIBUSI], "hari_indeks": HARI_ATRIBUSI,
         "n_api": sum(s["jenis"] == "api" for s in src), "n_pltu": sum(s["jenis"] == "pltu" for s in src),
         "n_terpercaya": sum(b["terpercaya"] for b in simpan), "n_tak_terpercaya": sum(not b["terpercaya"] for b in simpan),
         "lebar_rentang_rata": round(sum(lebar) / len(lebar), 1) if lebar else None, "kota": simpan, "asumsi": ASUMSI}
    nb = alat.simpan("atribusi.json", d)
    for k in prak["kota"]:
        k["asap"] = asap.get(k["kode"], [None, None, None])
    alat.simpan("prakiraan.json", prak)
    top = sorted((b for b in baris if b["terpercaya"]), key=lambda b: -b["pm"])[:3]
    alat.log(f"atribusi.json: {nb // 1024} KB, {len(simpan)} kota ({d['n_terpercaya']} terpercaya, {d['n_tak_terpercaya']} tidak), "
             f"lebar rentang rata {d['lebar_rentang_rata']} poin; {d['n_api']} api, {d['n_pltu']} PLTU; "
             + "; ".join(f"{b['nama']} {b['pm']} (model {b['model']}): " + ", ".join(f"{x['nama']} {x['persen']}% ({x['rendah']}-{x['tinggi']})" for x in b["bagian"][:3]) for b in top))


def uji():
    assert kelas(1, 12) == "A" and kelas(7, 12) == "C" and kelas(1, 2) == "F" and kelas(4, 23) == "D" and kelas(4, 7) == "C"
    try:
        kelas(-1, 12)
        raise AssertionError("angin negatif harus ditolak")
    except ValueError:
        pass
    # plume: di bawah angin > 0, melawan angin = 0, tercampur rata jauh: Q/(sqrt(2pi) sy u H); sy D 100 km = 2.412 m < 0,1x -> 10.000 m
    assert konsentrasi(1000, -50_000, 0, 5, 0, "D", 1000) == 0 and konsentrasi(1000, 100, 0, 5, 0, "D", 1000) == 0
    c = konsentrasi(1000, 100_000, 0, 5, 0, "D", 400)   # sigma_z D 100 km = 488 m >= 0,8 x 400: tercampur rata
    sy = max(.08 * 1e5 / math.sqrt(11), MEANDER * 1e5)
    assert abs(c - 1e9 / (math.sqrt(2 * math.pi) * sy * 5 * 400)) < 1e-6, c
    sz = .06 * 1e5 / math.sqrt(151)                    # H 1000: belum tercampur, rumus Gauss permukaan dengan pantulan
    assert abs(konsentrasi(1000, 100_000, 0, 5, 0, "D", 1000) - 1e9 / (math.pi * sy * sz * 5)) < 1e-6
    assert konsentrasi(1000, 100_000, 30_000, 5, 0, "D", 400) < c / 50                     # jauh menyamping: turun tajam
    assert konsentrasi(1000, 100_000, 0, 5, 0, "D", 400, meander=.2) < c                   # sebaran samping lebih lebar: lebih encer
    assert konsentrasi(1000, 2_000, 0, 5, 0, "D", 1000, hs=200) < konsentrasi(1000, 2_000, 0, 5, 0, "D", 1000)  # cerobong tinggi lebih encer di dekat
    assert konsentrasi(1000, 2_000, 0, 5, 0, "F", 150, hs=400) == 0                        # cerobong di atas lapisan batas (min 300 m)
    try:
        konsentrasi(-1, 1e4, 0, 5, 0, "D", 800)
        raise AssertionError("emisi negatif harus ditolak")
    except ValueError:
        pass
    u, v = putar(1, 0, 90)
    assert abs(u) < 1e-9 and abs(v - 1) < 1e-9
    # emisi: 4000 MW-jumlah FRP gambut, 4 lintasan -> 1000 MW x 0,368 kg/MJ x 17,3 g/kg = 6.366 g/s
    s = {"jenis": "api", "basis": 4000 * DM_PER_MJ, "ef": EF_GAMBUT}
    assert abs(skala(s, (1, 1, 1)) - 6366.4) < .1 and skala(s, (0, 0, 0)) < skala(s, (1, 1, 1)) < skala(s, (2, 2, 2))
    p = {"jenis": "pltu", "basis": 1000 * .6 * 1000 / 3600}
    assert abs(skala(p, (1, 1, 1)) - 1000 * .6 * .15 * 1000 / 3600) < 1e-9      # 1 GW, fk 0,6, 0,15 kg/MWh = 25 g/s
    # ujung-ke-ujung: api kecil di hulu kota A (angin barat 5 m/s), PLTU di hilir; kota B dekat api besar -> model >> CAMS
    A = lintasan.angin_uji(50, 0)
    A["blh"] = [[[800] * 47 for _ in range(18)] for _ in range(25)]
    t0 = alat.dari_iso("2026-10-18T03:00Z")
    jam = [alat.iso(t0 + dt.timedelta(hours=h)) for h in range(72)]
    hari = ["2026-10-18", "2026-10-19", "2026-10-20"]
    pm_a = [300] * 72
    pm_a[0] = None
    prak = {"jam": jam, "hari": hari, "kota": [{"kode": "1671", "pm": pm_a}, {"kode": "6271", "pm": [20] * 72}]}
    kota = [{"kode": "1671", "nama": "Kota Palembang", "prov": "16", "lat": -3.0, "lon": 104.75},
            {"kode": "6271", "nama": "Kota Palangkaraya", "prov": "62", "lat": -2.2, "lon": 113.95}]
    src = [{"jenis": "api", "id": "K1", "nama": "Kompleks api OKI", "lon": 104.0, "lat": -3.0, "hs": 0.0, "basis": 400 * DM_PER_MJ, "ef": EF_GAMBUT, "konsesi": ["PT A"]},
           {"jenis": "pltu", "id": "W1", "nama": "PLTU X", "lon": 105.5, "lat": -3.0, "hs": 200.0, "basis": 1000 * .6 * 1000 / 3600, "konsesi": []},
           {"jenis": "api", "id": "K2", "nama": "Kompleks api Pulang Pisau", "lon": 113.7, "lat": -2.2, "hs": 0.0, "basis": 20000 * DM_PER_MJ, "ef": EF_GAMBUT, "konsesi": []}]
    src += [{"jenis": "api", "id": f"KX{i}", "nama": f"api kecil {i}", "lon": 104.0 - .05 * i, "lat": -3.0 + .02 * i, "hs": 0.0,
             "basis": 300 * DM_PER_MJ, "ef": EF_HUTAN, "konsesi": []} for i in range(1, 9)]   # 8 api kecil: memaksa bagian "lain"
    b, asap = hitung(kota, prak, A, src, t0)
    ka, kb = b
    assert any(x["jenis"] == "lain" for x in ka["bagian"]), ka["bagian"]
    assert all(0 <= x["rendah"] <= x["persen"] <= x["tinggi"] <= 100 for x in ka["bagian"]), ka["bagian"]   # gabungan per skenario, tak > 100
    geom = {"type": "Polygon", "coordinates": [[[104.9, -1.1], [105.1, -1.1], [105.1, -0.9], [104.9, -0.9], [104.9, -1.1]]]}
    kl = {"features": [{"geometry": geom, "properties": {"id": "K9", "lat": -1.0, "lon": 105.0, "akhir": "2026-10-18T02:00:00+00:00", "frp24": 10, "gambut": True}}]}
    sl = sumber_list(kl, [], t0, [(-1.0, 105.0, "PT Boleh"), (-1.0, 105.0, "CV Nama Orang"), (-1.0, 105.0, "Nama Orang")])
    assert sl[0]["konsesi"] == ["PT Boleh"] and all(lintasan.badan_usaha(n) for s_ in sl for n in s_["konsesi"])
    bag = {x["id"]: x for x in ka["bagian"]}
    assert ka["terpercaya"] and "W1" not in bag and bag["K1"]["rendah"] <= bag["K1"]["persen"] <= bag["K1"]["tinggi"] and bag["K1"]["tinggi"] > bag["K1"]["rendah"], bag
    assert bag["latar"]["rendah"] == 0 and abs(sum(x["persen"] for x in ka["bagian"]) - 100) <= 1 and bag["K1"]["konsesi"] == ["PT A"]
    assert ka["pm"] == 300 and 0 < asap["1671"][1] <= 1 and len(asap["1671"]) == 3
    assert not kb["terpercaya"] and kb["bagian"] == [] and "1,5× CAMS" in kb["alasan"] and asap["6271"][1] is None, kb
    print("atribusi uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
