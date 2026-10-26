#!/usr/bin/env python3
"""SIPPA SP-099: akses ke 865 kompleks api Kalteng (prov 62) dari posko/Daops terdekat lewat graf jalan OSM.

Pakai:  python3 scripts/data/sippa/akses_sippa.py          # bangun -> data/sippa/keluaran/akses_kompleks.json, lalu uji
        python3 scripts/data/sippa/akses_sippa.py uji      # self-check atas berkas keluaran (tanpa OSM mentah)
Mentah OSM: data/raw/pipa/osm/ubin_*.json (pipa_data.py langkah osm; env SIPPA_OSM menimpa lokasinya). ODbL (c) kontributor OpenStreetMap.
Semua angka berlabel `estimasi-model` (perencanaan, bukan navigasi). Python stdlib; memakai km/indeks/dekat/sambung_pulau/sederhana dari scripts/scrape/akses.py.

MODEL
  graf jalan kendaraan: highway motorway..tertiary, unclassified, residential, service, living_street, track (+_link). Simpul = persimpangan,
    ujung ruas, jangkar tiap <= 0,5 km. Laju km/jam: utama (trunk/primary) 50, sekunder 40, tersier 30, lokal 25, track 15 (musim kemarau); selaras akses.py.
  graf air: waterway=river 15 km/jam, canal 8 km/jam (perahu kecil); parit dan anak sungai tidak dilayari.
  alih jalan<->perahu: simpul <= 1 km, 30 menit naik-turun + jalan kaki 4 km/jam.
  celah peta (komponen jalan kecil disambung ke komponen lain <= 5 km, garis lurus x 1,3 pada 10 km/jam): kelas `celah` (jalan kebun tak terpeta).
  markas (Daops + posko) ke simpul jalan ATAU sungai <= 10 km: garis lurus x 1,3 pada 20 km/jam. Sumber = SEMUA Daops dan posko di kotak Kalimantan tengah.
  ujung: dari simpul jalan ATAU perahu yang total (waktu graf + jalan kaki) terkecil dalam 40 km garis lurus ke titik kompleks, jalan kaki di gambut
    4 km/jam x kelok 1,3 (perahu terpilih otomatis bila lebih cepat). kaki_tak_realistis bila km.kaki > 5: total_menit = batas atas, saran udara, tak ikut ringkas.
  air terdekat: titik OSM terdekat (sungai/kanal/parit/anak sungai/tepi danau, garis lurus) dari osm_jarak.csv + kelas JRC GSW dari gsw_air_terdekat.csv.
  zona A-D tiga versi, operator `<` (keputusan 51): air < 2,5 km dan jalan < 5 km = A; air< & jalan>= B; air>= & jalan< C; D sisanya.
    k: kendala.json (air_km, jalan_km; null = jauh), u: air_semua x jalan_utama (tersier ke atas), o: air_semua x jalan_kend (semua + track).

KELUARAN data/sippa/keluaran/akses_kompleks.json
  {dibuat, per, versi:"sippa_akses/1", keyakinan:"estimasi-model", ambang, sumber[], catatan, asumsi{laju_kmj,..}, ringkas{zona:{versi:{zona:{n,median,p90}}},
   n_realistis, n_kaki_tak_realistis, sensitivitas_kaki, n_perahu, n_track, n_celah, n_tak_terjangkau, median_total_menit, p90_total_menit}, kompleks:[...]}
  kompleks[i] = {id, kab, lat, lon,
    dari:{jenis:"daops"|"posko", kode, nama}, garis_lurus_km,
    total_menit (int, = jumlah menit.*), menit:{jalan, alih, perahu, kaki} (int; alih = naik/turun perahu + jalan ke dermaga),
    km:{jalan, perahu, kaki}, jalan_kelas_menit:{utama|sekunder|tersier|lokal|track|celah|markas: menit} (hanya yang > 0),
    ujung:"kaki"|"perahu" (perahu bila ada ruas perahu pada rute), daops:{kode, nama, total_menit}|null (Daops terdekat menurut rute),
    rute:[[lon,lat],...] (Douglas-Peucker, <= 40 titik, 4 desimal, dari markas ke kompleks),
    air:{km, jenis, lat, lon, gsw:"permanen"|"musiman"|"tak_terdeteksi"},
    zona:{k, u, o}, track_perlu_cek (rute memakai ruas track), celah_peta (rute memakai celah/jalan tak terpeta), tak_terjangkau}
  Kompleks tanpa simpul graf dalam 40 km: dari/total_menit/menit/km/rute = null, tak_terjangkau true. kaki_tak_realistis (bool) + saran (string) pada yang jalan kakinya > 5 km.
"""
import array, csv, glob, heapq, json, math, os, sys, time
from collections import Counter

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
import akses as A  # noqa: E402  (scripts/scrape/akses.py)

JANGKAR_KM = 0.5  # simpul tiap <= 0,5 km (akses.py: 2 km) -> graf ~4x lebih rapat
# ambang "pulau" akses.py (3000 simpul pada jangkar 2 km) harus diskalakan, kalau tidak komponen 3000-12000 simpul tak pernah dijembatani celah
A.PULAU = round(A.PULAU * A.JANGKAR_KM / JANGKAR_KM)
A.SEL = 0.02  # indeks ruang lebih rapat (graf rapat); dekat()/indeks() membaca A.SEL saat dipanggil
MENTAH = os.environ.get("SIPPA_OSM") or os.path.join(AKAR, "data/raw/pipa/osm")
CSV = os.path.join(AKAR, "data/kajian-bnpb/pipa/data")
KELUAR = os.path.join(AKAR, "data/sippa/keluaran/akses_kompleks.json")
DATA = os.path.join(AKAR, "public/data")

JALAN = {"motorway": "utama", "trunk": "utama", "primary": "utama", "secondary": "sekunder", "tertiary": "tersier",
         "unclassified": "lokal", "residential": "lokal", "service": "lokal", "living_street": "lokal", "track": "track"}
LAJU = {"utama": 50, "sekunder": 40, "tersier": 30, "lokal": 25, "track": 15, "sungai": 15, "kanal": 8}
# sumber tiap laju: selaras scripts/scrape/akses.py (LAJU, KAKI_KMJ, PINDAH_MENIT, MARKAS_KMJ, CELAH_KMJ) supaya platform konsisten
SUMBER_LAJU = {"utama": "akses.py LAJU trunk/primary", "sekunder": "akses.py LAJU secondary", "tersier": "akses.py LAJU tertiary",
               "lokal": "akses.py LAJU unclassified (residential/service/living_street disamakan)", "track": "akses.py LAJU track",
               "sungai": "akses.py LAJU river", "kanal": "asumsi, belum ada sumber",
               "celah": "akses.py CELAH_KMJ", "markas": "akses.py MARKAS_KMJ",
               "kaki_gambut": "akses.py KAKI_KMJ (4); 2 km/jam diuji sebagai sensitivitas", "kaki_dermaga": "akses.py KAKI_KMJ"}
AIR = {"river": "sungai", "canal": "kanal"}
ALIH_KM, ALIH_MENIT, JALAN_KAKI_KMJ = 1.0, 30.0, 4.0
GAMBUT_KMJ, KELOK = 4.0, 1.3
KAKI_MAKS_REALISTIS_KM = 5.0  # jalan kaki lebih jauh dari ini (km jalan, sudah x kelok) tidak dianggap rute darat yang realistis
MARKAS_KM, MARKAS_KMJ = 10.0, 20.0
UJUNG_MAKS_KM = 40.0
SARAN = "andalkan udara atau titik turun terdekat"
KOTAK = (-4.6, 0.6, 109.8, 116.8)  # lat min/max, lon min/max: sumber markas
AMBANG_AIR, AMBANG_JALAN = 2.5, 5.0
MAKS_TITIK = 40
KUNCI = lambda la, lo: (la + 2_000_000) * 100_000_000 + lo  # la, lo = derajat x 1e5 (bulat)
BATAS_BYTE = 8 * 1024 * 1024


def zona(air, jalan):
    a = air is not None and air < AMBANG_AIR
    j = jalan is not None and jalan < AMBANG_JALAN
    return "A" if a and j else "B" if a else "C" if j else "D"


def kuantil(v, q):  # tipe 7
    v = sorted(v)
    h = (len(v) - 1) * q
    lo = math.floor(h)
    return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (h - lo)


# ---------- graf ----------
def muat_ruas():
    """ubin Overpass -> (jalan, air): [(kelas, array lat1e5, array lon1e5)], way unik per id."""
    seen, jalan, air = set(), [], []
    for fn in sorted(glob.glob(f"{MENTAH}/ubin_*.json")):
        for e in json.load(open(fn))["elements"]:
            if e["type"] != "way" or e["id"] in seen or len(e.get("geometry", ())) < 2:
                continue
            t = e.get("tags", {})
            kl, tujuan = JALAN.get(t.get("highway", "").replace("_link", "")), jalan
            if kl is None:
                kl, tujuan = AIR.get(t.get("waterway")), air
            if kl is None:
                continue
            seen.add(e["id"])
            g = e["geometry"]
            tujuan.append((kl, array.array("i", (round(p["lat"] * 1e5) for p in g)), array.array("i", (round(p["lon"] * 1e5) for p in g))))
        print("muat", os.path.basename(fn), len(jalan), "jalan", len(air), "air", flush=True)
    return jalan, air


def km5(a, b):  # jarak antara dua (lat1e5, lon1e5)
    return A.km(a[0] / 1e5, a[1] / 1e5, b[0] / 1e5, b[1] / 1e5)


def bangun(jalan, air):
    """-> simpul [(lat, lon)], sisi [(a, b, menit, meter, kelas)], simpul_air (hanya di graf air)"""
    ruas = []
    for kl, la, lo in jalan + air:
        pts = list(zip(la, lo))
        out = [pts[0]]
        for p, q in zip(pts, pts[1:]):
            n = math.ceil(km5(p, q) / JANGKAR_KM) - 1
            out += [(round(p[0] + (q[0] - p[0]) * t / (n + 1)), round(p[1] + (q[1] - p[1]) * t / (n + 1))) for t in range(1, n + 1)] + [q]
        ruas.append((kl, out))
    jml = Counter(KUNCI(*p) for _, pts in ruas for p in pts)
    idx, simpul, sisi = {}, [], []

    def id_(p):
        k = KUNCI(*p)
        if k not in idx:
            idx[k] = len(simpul)
            simpul.append((p[0] / 1e5, p[1] / 1e5))
        return idx[k]
    for kl, pts in ruas:
        a, d = id_(pts[0]), 0.0
        for i in range(1, len(pts)):
            d += km5(pts[i - 1], pts[i])
            if i == len(pts) - 1 or jml[KUNCI(*pts[i])] > 1 or d >= JANGKAR_KM * 0.99:
                b = id_(pts[i])
                if b != a:
                    sisi.append((a, b, d / LAJU[kl] * 60, d * 1000, kl))
                a, d = b, 0.0
    del ruas, jml
    ak = set(AIR.values())
    sn = {x for a, b, _, _, k in sisi if k in ak for x in (a, b)}
    jn = {x for a, b, _, _, k in sisi if k not in ak for x in (a, b)}
    ind = A.indeks(simpul, jn)
    for s in sn - jn:  # dermaga: simpul air -> dua simpul jalan terdekat dalam ALIH_KM
        for d, j in sorted((d, j) for j, d in A.dekat(ind, simpul, *simpul[s], ALIH_KM))[:2]:
            sisi.append((s, j, ALIH_MENIT + d / JALAN_KAKI_KMJ * 60, d * 1000, "alih"))
    # celah peta (seperti akses.py): komponen kecil jalan DAN sungai disambung ke komponen lain; graf dipadatkan, sambung_pulau, petakan balik.
    # Tanpa ini ujung sungai terpencil (mis. K0075) tak punya jalur sama sekali padahal akses.json memberi rute.
    balik = sorted(jn | sn)
    lokal = {n: i for i, n in enumerate(balik)}
    sj = [(lokal[a], lokal[b], 0, 0) for a, b, _, _, k in sisi]
    for i, j, m, dm in A.sambung_pulau([simpul[n] for n in balik], sj):
        sisi.append((balik[i], balik[j], m, dm, "celah"))
    return simpul, sisi, sn - jn


def dijkstra(adj, benih):
    """benih {simpul: (menit, asal)} -> (t, prev). prev[i] = (simpul_sebelum | -1, kelas, menit, meter, asal)"""
    t, prev, h = {}, {}, []
    for i, (m, asal) in benih.items():
        t[i], prev[i] = m, (-1, "markas", m, 0.0, asal)
        h.append((m, i))
    heapq.heapify(h)
    while h:
        m, i = heapq.heappop(h)
        if m > t[i]:
            continue
        for j, mm, dm, kl in adj[i]:
            n = m + mm
            if n < t.get(j, 1e18):
                t[j], prev[j] = n, (i, kl, mm, dm, None)
                heapq.heappush(h, (n, j))
    return t, prev


def markas():
    out = [{"jenis": "daops", "kode": d["kode"], "nama": d["nama"], "lat": d["lat"], "lon": d["lon"]}
           for d in json.load(open(f"{DATA}/daops.json"))]
    out += [{"jenis": "posko", "kode": p["id"], "nama": p["nama"], "lat": p["lat"], "lon": p["lon"]}
            for p in json.load(open(f"{DATA}/posko.json"))["posko"]]
    return [m for m in out if KOTAK[0] <= m["lat"] <= KOTAK[1] and KOTAK[2] <= m["lon"] <= KOTAK[3]]


def kompleks():
    kd = json.load(open(f"{DATA}/kendala.json"))["kompleks"]
    op = {x["id"]: x for x in json.load(open(f"{DATA}/operasi.json"))["kompleks"]}
    rows = [{"id": i, "kab": v["kab"], "lat": op[i]["lat"], "lon": op[i]["lon"], "air_lama": v["air_km"], "jalan_lama": v["jalan_km"]}
            for i, v in kd.items() if v["prov"] == "62"]
    assert len(rows) == 865, len(rows)
    return sorted(rows, key=lambda r: r["id"])


def csv_id(nama):
    return {r["id"]: r for r in csv.DictReader(open(f"{CSV}/{nama}"))}


def fl(x):
    return float(x) if x not in ("", None) else None


def rantai_dari(prev, node):
    """telusur mundur -> ([(simpul, kelas, menit, meter)] markas..node, indeks markas asal)"""
    r, i = [], node
    while True:
        p = prev[i]
        r.append((i, p[1], p[2], p[3]))
        if p[0] < 0:
            return r[::-1], p[4]
        i = p[0]


def pilih_ujung(ind, simpul, t, lat, lon):
    """simpul dengan t + jalan kaki gambut terkecil: (menit_total, simpul, km_garis) atau None."""
    per_km = KELOK / GAMBUT_KMJ * 60  # menit jalan kaki per km garis lurus
    r, terbaik = 15.0, None
    while True:  # perluas sampai UJUNG_MAKS_KM; simpul di luar r tak mungkin menang bila r*per_km >= biaya terbaik
        c = [(t[i] + d * per_km, i, d) for i, d in A.dekat(ind, simpul, lat, lon, r) if i in t]
        if c:
            terbaik = min(c)
        if r >= UJUNG_MAKS_KM or (terbaik and terbaik[0] <= r * per_km):
            return terbaik
        r = UJUNG_MAKS_KM if not terbaik else min(UJUNG_MAKS_KM, terbaik[0] / per_km + 0.01)


def polyline(pts):
    """[(lon, lat)] -> Douglas-Peucker <= MAKS_TITIK titik, [[lon, lat]] 4 desimal."""
    pts = [(round(x, 4), round(y, 4)) for x, y in pts]
    pts = [p for i, p in enumerate(pts) if i == 0 or p != pts[i - 1]]
    yx, tol = [(y, x) for x, y in pts], 0.0003
    while True:
        sd = A.sederhana(yx, tol)
        if len(sd) <= MAKS_TITIK:
            return [[x, y] for y, x in sd]
        tol *= 1.5


def hitung():
    t0 = time.time()
    jalan, air = muat_ruas()
    simpul, sisi, sungai = bangun(jalan, air)
    del jalan, air
    print(f"graf {len(simpul)} simpul {len(sisi)} sisi ({time.time() - t0:.0f} dtk)", flush=True)
    adj = [[] for _ in simpul]
    for a, b, m, d, k in sisi:
        adj[a].append((b, m, d, k))
        adj[b].append((a, m, d, k))
    ind = A.indeks(simpul)
    mk = markas()
    benih = {}
    for n, m in enumerate(mk):
        for i, d in A.dekat(ind, simpul, m["lat"], m["lon"], MARKAS_KM):
            menit = d * KELOK / MARKAS_KMJ * 60
            if menit < benih.get(i, (1e18,))[0]:  # seperti akses.py: markas boleh menjangkau simpul jalan maupun sungai (desa di tepi sungai)
                benih[i] = (menit, n)
    print(len(mk), "markas,", len(benih), "simpul benih", flush=True)
    t, prev = dijkstra(adj, benih)
    td, prev_d = dijkstra(adj, {i: v for i, v in benih.items() if mk[v[1]]["jenis"] == "daops"})
    ak_air, ak_gsw = csv_id("osm_jarak.csv"), csv_id("gsw_air_terdekat.csv")
    out = []
    for k in kompleks():
        o, g = ak_air[k["id"]], ak_gsw[k["id"]]
        km_air, km_utama, km_kend = fl(o["air_semua_km"]), fl(o["jalan_utama_km"]), fl(o["jalan_kend_km"])
        e = {"id": k["id"], "kab": k["kab"], "lat": round(k["lat"], 4), "lon": round(k["lon"], 4)}
        u = pilih_ujung(ind, simpul, t, k["lat"], k["lon"])
        if u is None:
            e.update(dari=None, garis_lurus_km=None, total_menit=None, menit=None, km=None, jalan_kelas_menit=None, ujung=None, daops=None,
                     rute=None, tak_terjangkau=True, track_perlu_cek=False, celah_peta=False, kaki_tak_realistis=False, saran=SARAN)
        else:
            _, node, dkaki = u
            rantai, asal = rantai_dari(prev, node)
            leg, kmleg, kelas = Counter(), Counter(), Counter()
            for _, kl, m, dm in rantai:
                if kl == "alih":
                    leg["alih"] += m
                elif kl in ("sungai", "kanal"):
                    leg["perahu"] += m
                    kmleg["perahu"] += dm / 1000
                else:
                    leg["jalan"] += m
                    kmleg["jalan"] += dm / 1000
                    kelas[kl] += m
            menit = {"jalan": round(leg["jalan"]), "alih": round(leg["alih"]), "perahu": round(leg["perahu"]),
                     "kaki": round(dkaki * KELOK / GAMBUT_KMJ * 60)}
            m = mk[asal]
            ud = pilih_ujung(ind, simpul, td, k["lat"], k["lon"])
            dops = None
            if ud:
                _, a_d = rantai_dari(prev_d, ud[1])
                dops = {"kode": mk[a_d]["kode"], "nama": mk[a_d]["nama"], "total_menit": round(ud[0])}
            e.update(dari={"jenis": m["jenis"], "kode": m["kode"], "nama": m["nama"]},
                     garis_lurus_km=round(A.km(m["lat"], m["lon"], k["lat"], k["lon"]), 1),
                     total_menit=sum(menit.values()), menit=menit,
                     km={"jalan": round(kmleg["jalan"], 1), "perahu": round(kmleg["perahu"], 1), "kaki": round(dkaki * KELOK, 1)},
                     jalan_kelas_menit={c: round(v) for c, v in sorted(kelas.items()) if round(v) > 0},
                     ujung="perahu" if leg["perahu"] > 0 else "kaki", daops=dops,
                     rute=polyline([(m["lon"], m["lat"])] + [(simpul[n][1], simpul[n][0]) for n, *_ in rantai] + [(k["lon"], k["lat"])]),
                     tak_terjangkau=False, track_perlu_cek=kelas.get("track", 0) > 0, celah_peta=kelas.get("celah", 0) > 0,
                     kaki_tak_realistis=dkaki * KELOK > KAKI_MAKS_REALISTIS_KM)
            if e["kaki_tak_realistis"]:
                e["saran"] = SARAN
        e["air"] = {"km": km_air, "jenis": o["air_semua_jenis"], "lat": fl(o["air_semua_lat"]), "lon": fl(o["air_semua_lon"]), "gsw": g["gsw_kelas"]}
        e["zona"] = {"k": zona(k["air_lama"], k["jalan_lama"]), "u": zona(km_air, km_utama), "o": zona(km_air, km_kend)}
        out.append(e)
    print(f"akses {len(out)} kompleks ({time.time() - t0:.0f} dtk)", flush=True)
    return out


def ringkas(ks):
    """median/p90 hanya atas rute darat yang realistis (tanpa tak_terjangkau dan kaki_tak_realistis)."""
    jang = [e for e in ks if e["total_menit"] is not None]
    ok = [e for e in jang if not e["kaki_tak_realistis"]]
    z = {}
    for v in "kuo":
        z[v] = {}
        for zz in "ABCD":
            m = [e["total_menit"] for e in ok if e["zona"][v] == zz]
            z[v][zz] = {"n": sum(e["zona"][v] == zz for e in ks), "median": round(kuantil(m, .5)) if m else None, "p90": round(kuantil(m, .9)) if m else None}
    # sensitivitas: rute tetap, hanya menit jalan kaki gambut diubah dari 4 ke 2 km/jam (menit.kaki x 2)
    tot2 = [e["total_menit"] + e["menit"]["kaki"] * (GAMBUT_KMJ / 2 - 1) for e in ok]
    return {"zona": z, "n_realistis": len(ok), "n_perahu": sum(e["ujung"] == "perahu" for e in ok), "n_track": sum(e["track_perlu_cek"] for e in ok),
            "n_celah": sum(e["celah_peta"] for e in ok), "n_tak_terjangkau": len(ks) - len(jang),
            "n_kaki_tak_realistis": len(jang) - len(ok),
            "median_total_menit": round(kuantil([e["total_menit"] for e in ok], .5)), "p90_total_menit": round(kuantil([e["total_menit"] for e in ok], .9)),
            "sensitivitas_kaki": {"median_menit_kaki_4kmj": round(kuantil([e["total_menit"] for e in ok], .5)), "median_menit_kaki_2kmj": round(kuantil(tot2, .5)),
                                  "catatan": "rute tetap; hanya menit.kaki diganda; himpunan realistis tetap"}}


def tulis(ks):
    wib = time.strftime("%Y-%m-%dT%H:%M", time.gmtime(time.time() + 7 * 3600)) + "+07:00"
    doc = {"dibuat": wib, "per": "2026-10-24", "versi": "sippa_akses/1", "keyakinan": "estimasi-model",
           "ambang": {"air_km": AMBANG_AIR, "jalan_km": AMBANG_JALAN, "aturan": "strict <, keputusan 51"},
           "sumber": [{"nama": "OpenStreetMap (Overpass) jalan dan waterway, ubin 0,5 derajat", "lisensi": "ODbL", "tarik": "2026-10-24"},
                      {"nama": "posko.json, daops.json, kendala.json, operasi.json (Pantau Bencana)", "lisensi": "internal", "tarik": "2026-10-26"},
                      {"nama": "JRC Global Surface Water v1.4 (kelas titik air)", "lisensi": "CC-BY 4.0", "tarik": "2026-10-25"}],
           "catatan": "Estimasi model untuk perencanaan, bukan navigasi. Jalan kelas track belum tentu dapat dilalui saat hujan (track_perlu_cek). "
                      "Ruas 'celah' adalah jalan kebun tak terpeta yang diasumsikan. Waktu tidak memuat penugasan, antre, atau banjir. "
                      f"kaki_tak_realistis (jalan kaki > {KAKI_MAKS_REALISTIS_KM:g} km): total_menit adalah batas atas, darat tidak realistis; "
                      f"saran: {SARAN}; tidak ikut median/p90 di ringkas.",
           "asumsi": {"laju_kmj": {**LAJU, "celah": 10, "markas": MARKAS_KMJ, "kaki_gambut": GAMBUT_KMJ, "kaki_dermaga": JALAN_KAKI_KMJ},
                      "sumber": SUMBER_LAJU, "alih_sumber": "akses.py PINDAH_MENIT (30) dan PINDAH_KM (1)",
                      "kelok_garis_lurus": KELOK, "alih_menit": ALIH_MENIT, "alih_maks_km": ALIH_KM, "markas_maks_km": MARKAS_KM,
                      "ujung_maks_km": UJUNG_MAKS_KM, "kaki_maks_realistis_km": KAKI_MAKS_REALISTIS_KM, "jangkar_km": JANGKAR_KM},
           "ringkas": ringkas(ks), "kompleks": ks}
    teks = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    assert len(teks.encode()) <= BATAS_BYTE, len(teks)
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    open(KELUAR, "w").write(teks)
    print("tulis", KELUAR, len(teks) // 1024, "KB")


# ---------- self-check ----------
def hingga(x):
    if isinstance(x, float):
        return math.isfinite(x)
    if isinstance(x, dict):
        return all(hingga(v) for v in x.values())
    if isinstance(x, list):
        return all(hingga(v) for v in x)
    return True


def uji():
    assert zona(2.4999, 4.9999) == "A" and zona(2.5, 4.99) == "C" and zona(2.4, 5.0) == "B" and zona(2.5, 5.0) == "D" and zona(None, None) == "D"
    d = json.load(open(KELUAR))
    ks = d["kompleks"]
    assert len(ks) == 865 and len({e["id"] for e in ks}) == 865, len(ks)
    assert d["keyakinan"] == "estimasi-model" and d["asumsi"]["laju_kmj"]
    assert hingga(d), "ada NaN/inf"
    for e in ks:
        assert all(e["zona"][v] in "ABCD" for v in "kuo"), e["id"]
        if e["tak_terjangkau"]:
            assert e["total_menit"] is None and e["rute"] is None and e["saran"] == SARAN and not e["kaki_tak_realistis"], e["id"]
            continue
        # batas bawah fisik: tak ada moda lebih cepat dari 50 km/jam, jarak minimal = garis lurus markas -> kompleks
        assert e["total_menit"] + 1 >= e["garis_lurus_km"] / 50 * 60, (e["id"], e["total_menit"], e["garis_lurus_km"])
        # bendera jalan kaki tak realistis konsisten dengan km.kaki (km dibulatkan 0,1) dan saran
        assert (e["km"]["kaki"] > KAKI_MAKS_REALISTIS_KM + 0.05) <= e["kaki_tak_realistis"] <= (e["km"]["kaki"] >= KAKI_MAKS_REALISTIS_KM - 0.05), (e["id"], e["km"]["kaki"])
        assert ("saran" in e) == e["kaki_tak_realistis"], e["id"]
        assert e["total_menit"] == sum(e["menit"].values()) and all(isinstance(m, int) and m >= 0 for m in e["menit"].values()), (e["id"], e["menit"])
        assert e["total_menit"] > 0, e["id"]
        assert 2 <= len(e["rute"]) <= MAKS_TITIK, (e["id"], len(e["rute"]))
        assert all(-5 < y < 1 and 109 < x < 117 for x, y in e["rute"]), e["id"]
        assert e["track_perlu_cek"] or "track" not in e["jalan_kelas_menit"], e["id"]  # track < 30 detik dibulatkan hilang dari menit, bendera tetap
        assert e["ujung"] == "perahu" or (e["menit"]["perahu"] == 0 and e["km"]["perahu"] == 0), e["id"]
        assert sum(e["jalan_kelas_menit"].values()) <= e["menit"]["jalan"] + len(e["jalan_kelas_menit"]), e["id"]  # selisih pembulatan
    for v, ref in {"k": (188, 418, 89, 170), "u": (198, 429, 81, 157), "o": (469, 158, 167, 71)}.items():  # angka buku, matriks_jarak.md
        got = tuple(sum(e["zona"][v] == z for e in ks) for z in "ABCD")
        assert got == ref, (v, got, ref)
    assert d["ringkas"] == ringkas(ks), "ringkas tidak sinkron"
    r = d["ringkas"]
    bendera = sum(e["kaki_tak_realistis"] for e in ks)
    assert r["n_kaki_tak_realistis"] == bendera and r["n_realistis"] == sum(not e["kaki_tak_realistis"] and not e["tak_terjangkau"] for e in ks)
    assert r["n_realistis"] + bendera + r["n_tak_terjangkau"] == 865
    # ringkas tidak boleh memuat kompleks bertanda: median zona dihitung ulang tanpa mereka dan harus sama
    for v in "kuo":
        for z in "ABCD":
            m = [e["total_menit"] for e in ks if e["zona"][v] == z and e["total_menit"] is not None and not e["kaki_tak_realistis"]]
            assert r["zona"][v][z]["median"] == (round(kuantil(m, .5)) if m else None), (v, z)
    assert r["sensitivitas_kaki"]["median_menit_kaki_2kmj"] >= r["sensitivitas_kaki"]["median_menit_kaki_4kmj"]
    # contoh terkunci (invarian, bukan potret angka)
    S = {e["id"]: e for e in ks}
    k75 = S["K0075"]  # dulu tak terjangkau (aliran sungai terpencil); kini terjangkau lewat markas ke simpul sungai, seperti akses.json (A003)
    assert not k75["tak_terjangkau"] and k75["dari"]["kode"] == "A003" and k75["kaki_tak_realistis"], k75["id"]
    assert S["K0001"]["kaki_tak_realistis"] and S["K0001"]["km"]["kaki"] > 10  # jalan terdekat 15,8 km: darat tidak realistis
    k188 = S["K0188"]  # dekat Daops Palangkaraya, jalan utama
    assert not k188["kaki_tak_realistis"] and k188["dari"]["kode"] == "PLK-05" and 15 <= k188["total_menit"] <= 45, k188["total_menit"]
    print("uji akses_sippa: OK", r["n_realistis"], "realistis", r["n_kaki_tak_realistis"], "kaki tak realistis", r["n_perahu"], "perahu", r["n_track"], "track",
          r["n_celah"], "celah", r["n_tak_terjangkau"], "tak terjangkau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        tulis(hitung())
        uji()
