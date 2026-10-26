"""Telusur asal asap (P4): lintasan MUNDUR dari tiap kab/kota -> bagian asap per provinsi, per kompleks api, dan konsesi -> public/udara/data/asal.json

Pola emisi.app (udara dilacak mundur dari kota penerima, asap dijumlahkan dari titik api yang dilewati), memakai mesin lintasan.py apa adanya
(angin_di, geser: Heun 1 jam, 3 lapis angin.json) hanya dibalik arahnya. Tanpa model baru:
  jalur   : 5 waktu tiba (jam ke-24, 36, 48, 60, 72 sejak awal angin.json) x 3 lapis = 15 jalur mundur per kota. angin.json hanya memuat angin ke DEPAN
            (72 jam dari jam pertamanya), jadi jalur terpanjang 72 jam, bukan 96; jalur berhenti di awal data. Usul: angin.py minta past_days=2.
  bobot   : tiap titik jalur (diinterpolasi 4 per jam) dalam R_KOTA (25 km, sama dengan lintasan.py) dari kompleks api aktif menyumbang
            kedekatan (1 - d/25) x emisi kompleks / max(jarak kota-kompleks, 25 km).
            emisi   = atribusi.skala(kompleks, tengah): FRP 24 jam x 0,368 kg/MJ x EF gambut 17,3 atau hutan 9,1 g/kg (atribusi.ASUMSI, sumber di sana).
            1/jarak = pengenceran rezim tercampur: C ~ Q / (sigma_y u H) dengan sigma_y = 0,1 x jarak (atribusi.MEANDER).
  hujan   : pencucian TIDAK dipakai. Tak ada koefisien pencucian bersumber di repo; menebaknya sama dengan mengarang. Ditulis di batasan.
Bobot relatif (persen dari api yang dilewati), bukan konsentrasi. Kota dibuang (bukan 0%) bila kurang dari 2 dari 5 waktu tiba melewati api, atau PM2,5 prakiraannya < 30 µg/m3.
Pakai: python3 scripts/udara/asal.py   |   python3 scripts/udara/asal.py uji
"""
import datetime as dt
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
import alat
import atribusi
import lintasan
from wilayah import PROVINSI

TIBA = (24, 36, 48, 60, 72)      # jam sejak angin.json[jam][0]
MAKS_MUNDUR = 96
MIN_TIBA = 2          # kota ditulis hanya bila >= 2 dari 5 waktu tiba punya jalur yang melewati api; di bawah itu asalnya kebetulan
PM_MIN = 30           # kota dengan PM2,5 24 jam prakiraan tertinggi (3 hari) di bawah ini tidak diberi atribusi
SUB = 4
CEL = 0.25
TENGAH = (1, 1, 1)
BATASAN = [
    "Persen dinormalkan ke total bobot api yang dilewati jalur (jumlah 100%), jadi 100% berarti semua api yang dilewati ada di provinsi itu; dasar jumlah jalur yang kena tertulis di kalimat.",
    "Bagian asap adalah bobot relatif dari api yang dilewati jalur angin mundur (kedekatan x emisi api / jarak), bukan konsentrasi atau hasil ukur.",
    "Angin hanya tersedia 72 jam dari awal prakiraan, jadi jalur mundur paling panjang 72 jam; api yang lebih jauh ke belakang tidak terhitung.",
    "Api dianggap terus menyala seperti 24 jam terakhir; hujan yang mencuci asap tidak dihitung karena tidak ada koefisien pencucian bersumber.",
    "Konsesi menunjukkan titik panas berada di areal izin tercatat, bukan penetapan siapa yang membakar.",
]


def mundur(A, l, lon, lat, tiba, maks=MAKS_MUNDUR):
    """Heun mundur 1 jam dari (lon, lat) pada jam `tiba` -> [(lon, lat, jam_ke_belakang)]; berhenti di luar kisi/waktu atau sel kosong."""
    t = [(lon, lat, 0)]
    for k in range(maks):
        a = lintasan.angin_di(A, l, lon, lat, tiba - k)
        if a is None:
            break
        lo1, la1 = lintasan.geser(lon, lat, -a[0], -a[1], 3600)
        b = lintasan.angin_di(A, l, lo1, la1, tiba - k - 1)
        if b is None:
            break
        lon, lat = lintasan.geser(lon, lat, -(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2, 3600)
        t.append((lon, lat, k + 1))
    return t


def indeks_api(src):
    idx = {}
    for s in src:
        idx.setdefault((math.floor(s["lat"] / CEL), math.floor(s["lon"] / CEL)), []).append(s)
    return idx


def paparan(jalur, idx, kota, emisi):
    """{id kompleks: bobot} dari satu jalur; titik antara jam diinterpolasi linier."""
    out = {}
    for (lo0, la0, _), (lo1, la1, _) in zip(jalur, jalur[1:]):
        for n in range(SUB):
            f = n / SUB
            lon, lat = lo0 + (lo1 - lo0) * f, la0 + (la1 - la0) * f
            gy, gx = math.floor(lat / CEL), math.floor(lon / CEL)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    for s in idx.get((gy + dy, gx + dx), ()):
                        d = alat.jarak_km(lat, lon, s["lat"], s["lon"])
                        if d < lintasan.R_KOTA:
                            x = max(alat.jarak_km(kota["lat"], kota["lon"], s["lat"], s["lon"]), lintasan.R_KOTA)
                            out[s["id"]] = out.get(s["id"], 0.0) + (1 - d / lintasan.R_KOTA) * emisi[s["id"]] / x / SUB
    return out


def kalimat(k, prov, komp, kena):
    p, c = prov[0], komp[0]
    t = f"Asap yang sampai di {k['nama']} dari api yang dilewati angin paling banyak dari {PROVINSI.get(p[0], p[0])} ({p[1]}%, {kena[0]} dari {kena[1]} jalur)"
    t += f", terutama kompleks api di {c['kab']} ({c['persen']}%{', gambut' if c['gambut'] else ''})"
    if c["konsesi"]:
        t += f", titik panasnya di areal konsesi tercatat {c['konsesi'][0]}"
    return t + "."


def bangun(kota, A, src, t, pm_maks=None):
    jam0 = (t - alat.dari_iso(A["jam"][0])).total_seconds() / 3600
    akhir = (len(A["jam"]) - 1) * 3
    idx = indeks_api(src)
    emisi = {s["id"]: atribusi.skala(s, TENGAH) for s in src}
    info = {s["id"]: s for s in src}
    out = {}
    for k in kota:
        if pm_maks is not None and pm_maks.get(k["kode"], 0) < PM_MIN:
            continue
        tot, n_kena, n, tiba_kena = {}, 0, 0, 0
        for tiba in TIBA:
            if tiba > akhir:
                continue
            ada = False
            for l in range(len(A["lapis"])):
                n += 1
                p = paparan(mundur(A, l, k["lon"], k["lat"], tiba), idx, k, emisi)
                n_kena += bool(p)
                ada |= bool(p)
                for i, v in p.items():
                    tot[i] = tot.get(i, 0.0) + v
            tiba_kena += ada
        s = sum(tot.values())
        if s <= 0 or tiba_kena < MIN_TIBA:
            continue
        pr = {}
        for i, v in tot.items():
            pr[info[i]["prov"]] = pr.get(info[i]["prov"], 0.0) + v
        prov = [[p, round(100 * v / s)] for p, v in sorted(pr.items(), key=lambda x: -x[1])[:5]]
        prov = [x for x in prov if x[1] >= 1]
        komp = [{"id": i, "kab": info[i]["kab"] or "?", "prov": info[i]["prov"], "persen": round(100 * v / s), "gambut": info[i]["ef"] is atribusi.EF_GAMBUT,
                 "konsesi": info[i]["konsesi"][:2]} for i, v in sorted(tot.items(), key=lambda x: -x[1])[:3]]
        komp = [c for c in komp if c["persen"] >= 1]
        if not prov or not komp:
            continue
        out[k["kode"]] = {"nama": k["nama"], "prov": k["prov"], "prov_asal": prov, "kompleks": komp, "jalur_kena": [n_kena, n], "kalimat": kalimat(k, prov, komp, [n_kena, n])}
    return out


def main():
    t = alat.sekarang()
    A = alat.keluaran("angin.json")
    kl = alat.data("kluster.json")
    kab = {f["properties"]["id"]: f["properties"].get("kab") for f in kl["features"]}
    src = [s for s in atribusi.sumber_list(kl, [], t, lintasan.titik_konsesi())]
    for s in src:
        s["kab"] = kab.get(s["id"])
    kota = alat.kota()
    pm_maks = {k["kode"]: max(k["r24"]) for k in alat.keluaran("prakiraan.json")["kota"]}
    kota_asal = bangun(kota, A, src, t, pm_maks)
    if not kota_asal:
        raise RuntimeError("asal: tak ada kota yang jalurnya melewati api")
    d = {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "mulai": alat.iso(t), "n_api": len(src),
         "sumber": "Open-Meteo (angin 3 lapis), NASA FIRMS VIIRS, perkiraan Centurisk97",
         "batasan": BATASAN, "kota": kota_asal}
    nb = alat.simpan("asal.json", d)
    alat.log(f"asal.json: {nb // 1024} KB, {len(kota_asal)} kota dari {len(kota)}")


def uji():
    A = lintasan.angin_uji(100, 0)               # 10 m/s ke timur
    t = alat.dari_iso("2026-10-18T03:00Z")
    tr = mundur(A, 0, 105.0, 0.0, 24)
    assert tr[0] == (105.0, 0.0, 0) and abs(tr[-1][0] - (105.0 - 24 * 36000 / 111320)) < .01, tr[-1]   # berhenti di jam 0: 24 jam ke belakang
    assert len(mundur(A, 0, 130.0, 0.0, 72)) == 73 and len(mundur(A, 0, 130.0, 0.0, 100)) == 1   # di luar waktu data: tak ditebak
    mk = lambda i, lon, lat, frp, prov, kab, ef, kons: {"id": i, "lon": lon, "lat": lat, "basis": frp * atribusi.DM_PER_MJ, "ef": ef, "jenis": "api",
                                                         "konsesi": kons, "prov": prov, "kab": kab}
    src = [mk("H", 104.0, 0.0, 1000, "16", "OKI", atribusi.EF_GAMBUT, ["PT A"]),     # hulu (barat)
           mk("T", 106.0, 0.0, 9000, "14", "Siak", atribusi.EF_GAMBUT, []),            # hilir: tak pernah terlewati jalur mundur
           mk("U", 105.0, 3.0, 9000, "11", "Aceh", atribusi.EF_HUTAN, [])]            # samping
    kota = [{"kode": "1", "nama": "Kota X", "prov": "14", "lat": 0.0, "lon": 105.0}, {"kode": "2", "nama": "Kota Y", "prov": "14", "lat": 10.0, "lon": 120.0}]
    o = bangun(kota, A, src, t)
    assert list(o) == ["1"], "kota tanpa api di jalur dibuang"
    r = o["1"]
    assert r["prov_asal"] == [["16", 100]] and r["kompleks"][0]["id"] == "H" and r["kompleks"][0]["konsesi"] == ["PT A"] and r["jalur_kena"] == [15, 15], r
    assert r["kalimat"].startswith("Asap yang sampai di Kota X dari api yang dilewati angin paling banyak dari Sumatera Selatan (100%, 15 dari 15 jalur), terutama kompleks api di OKI") and "—" not in r["kalimat"], r["kalimat"]
    # dua api hulu: yang lebih besar dan lebih dekat menang, persen jumlah <= 100
    src.append(mk("H2", 103.9, 0.0, 3000, "62", "Kobar", atribusi.EF_HUTAN, []))
    r = bangun(kota, A, src, t)["1"]
    assert "1" not in bangun(kota, A, src, t, {"1": 10}), "PM < 30 tanpa atribusi"
    assert sum(x[1] for x in r["prov_asal"]) in range(98, 103) and len(r["kompleks"]) == 2
    print("asal.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
