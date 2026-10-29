"""#38: padam internet per provinsi dari IODA v2 (Georgia Tech; sinyal ping-slash24 = jumlah blok /24 yang menjawab ping).
-> public/data/internet_padam.json  (label riwayat padam, dipakai menara.py / #39)

Akses: https://api.ioda.inetintel.cc.gatech.edu/v2 (tanpa kunci; tanpa batas resmi, kita jeda 0,3 dtk; data (c) Georgia Tech, atribusi wajib).
Rumus: sinyal 10 menit -> median per jam. Garis dasar tiap jam h = median 7 nilai jam-yang-sama (hari-hari 1..7 sebelumnya);
       skala = max(1,4826*MAD, 1% garis dasar, 1);  z = (x - dasar)/skala.
       Jam padam = z <= -4 DAN turun >= 20% dari dasar. Peristiwa padam = >= 2 jam padam berurutan. (Ambang dikunci SEBELUM melihat hasil.)
Validasi: kesepakatan dengan peristiwa resmi IODA (per wilayah; tumpang tindih waktu) -> presisi/recall kita terhadap IODA.
Hubungan bencana: tabel 2x2 (hari-provinsi dengan >=1 kejadian DIBI jenis bahaya hari itu atau 1 hari sebelumnya) x (ada awal padam hari itu),
       odds ratio + p dari acak-geser-hari (label padam digeser melingkar, 2000x) = pembanding yang menjaga autokorelasi.
Cache mentah data/raw/ioda/ (potongan 30 hari, dapat dilanjutkan; potongan terakhir selalu diambil ulang).
Pakai: python3 scripts/umum/internet_padam.py [--hari 365]  |  ... uji
"""
import datetime as dt, importlib.util, json, os, random, statistics as st, sys, time

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(AKAR, "data/raw/ioda")
API = "https://api.ioda.inetintel.cc.gatech.edu/v2"
WIB = dt.timezone(dt.timedelta(hours=7))
# kode wilayah IODA (NetAcuity) -> kode provinsi BPS
WIL = {"1713": "11", "1714": "64", "1715": "32", "1716": "33", "1717": "17", "1718": "36", "1719": "31", "1720": "61", "1721": "18",
       "1722": "16", "1723": "19", "1724": "51", "1725": "35", "1726": "63", "1727": "53", "1728": "73", "1729": "76", "1730": "21",
       "1731": "75", "1732": "15", "1733": "62", "1734": "92", "1735": "12", "1736": "14", "1737": "71", "1738": "82", "1739": "13",
       "1740": "34", "1741": "81", "1742": "52", "1743": "74", "1744": "72", "1745": "91"}
Z_AMBANG, TURUN_MIN, JAM_MIN = -4.0, 0.20, 2


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


J = _mod("jaring")


def per_jam(nilai, dari, langkah):
    """Deret 10 menit (None boleh) -> {jam_epoch: median}."""
    h = {}
    for i, v in enumerate(nilai):
        if v is not None:
            h.setdefault((dari + i * langkah) // 3600, []).append(v)
    return {k: st.median(v) for k, v in h.items()}


def jam_padam(jam):
    """{jam: nilai} -> list (jam, z, turun) untuk jam-jam padam. Garis dasar: jam yang sama 7 hari sebelumnya (butuh >= 5 dari 7)."""
    out = []
    for h in sorted(jam):
        b = [jam[h - 24 * k] for k in range(1, 8) if (h - 24 * k) in jam]
        if len(b) < 5:
            continue
        m = st.median(b)
        if m <= 0:
            continue
        mad = st.median([abs(x - m) for x in b])
        z = (jam[h] - m) / max(1.4826 * mad, 0.01 * m, 1.0)
        turun = (m - jam[h]) / m
        if z <= Z_AMBANG and turun >= TURUN_MIN:
            out.append((h, z, turun))
    return out


def peristiwa(padam):
    """Jam padam -> peristiwa (>= JAM_MIN jam berurutan): list {mulai, jam, z_min, turun_maks} (mulai = epoch detik)."""
    ev, cur = [], []
    for p in padam + [(None, 0, 0)]:
        if cur and (p[0] is None or p[0] != cur[-1][0] + 1):
            if len(cur) >= JAM_MIN:
                ev.append({"mulai": cur[0][0] * 3600, "jam": len(cur), "z_min": round(min(c[1] for c in cur), 1),
                           "turun_maks": round(max(c[2] for c in cur), 2)})
            cur = []
        if p[0] is not None:
            cur.append(p)
    return ev


def hari_wib(epoch):
    return dt.datetime.fromtimestamp(epoch, WIB).date().isoformat()


def odds(a, b, c, d):
    """Tabel [[a,b],[c,d]] (a = bahaya&padam, b = bahaya&tak, c = tak&padam, d = tak&tak), koreksi Haldane 0,5."""
    return ((a + .5) * (d + .5)) / ((b + .5) * (c + .5))


def uji_geser(bahaya, padam, n=2000, benih=11):
    """OR teramati + p-geser: padam digeser melingkar per provinsi (dict prov -> list bool per hari), bahaya tetap."""
    def hitung(geser):
        a = b = c = d = 0
        for p in bahaya:
            P = padam[p]; L = len(P); s = geser.get(p, 0)
            for i in range(L):
                x, y = bahaya[p][i], P[(i + s) % L]
                a += x and y; b += x and not y; c += (not x) and y; d += (not x) and not y
        return odds(a, b, c, d), (a, b, c, d)
    o, tab = hitung({})
    r = random.Random(benih)
    ge = 0
    for _ in range(n):
        ge += hitung({p: r.randrange(7, len(padam[p]) - 7) for p in bahaya})[0] >= o
    return {"odds_ratio": round(o, 3), "tabel": list(tab), "p_geser": round((ge + 1) / (n + 1), 4)}


def ambil_seri(kode, dari, hingga, cache):
    """Potongan 30 hari per wilayah, cache per potongan; potongan yang berakhir < 2 hari lalu tak diambil ulang."""
    jam, t = {}, dari
    while t < hingga:
        u = min(t + 30 * 86400, hingga)
        k = f"{kode}_{t}"
        c = cache.get(k)
        if not c or u > time.time() - 2 * 86400 and time.time() - c["ts"] > 3600:
            d = J.ambil(f"{API}/signals/raw/region/{kode}?from={t}&until={u}&datasource=ping-slash24", jeda_host=0.3, batas=90)
            s = d["data"][0][0]
            c = cache[k] = {"ts": time.time(), "dari": s["from"], "langkah": s["step"], "v": s["values"]}
        jam.update(per_jam(c["v"], c["dari"], c["langkah"]))
        t = u
    return jam


def peristiwa_ioda(kode, dari, hingga):
    d = J.ambil(f"{API}/outages/events?entityType=region&entityCode={kode}&from={dari}&until={hingga}&limit=2000", jeda_host=0.3, batas=90)
    return [(e["start"], e["start"] + e["duration"]) for e in d["data"] if e.get("datasource") == "ping-slash24"]


def jalan(hari=365):
    kejadian = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))["kejadian"]
    os.makedirs(RAW, exist_ok=True)
    pc = os.path.join(RAW, "seri.json")
    cache = json.load(open(pc)) if os.path.exists(pc) else {}
    hingga = int(time.time()) // 3600 * 3600
    dari = hingga - hari * 86400
    ev_semua, harian, hasil_wil, gagal = [], {}, {}, []
    for kode, prov in WIL.items():
        try:
            jam = ambil_seri(kode, dari - 8 * 86400, hingga, cache)  # +8 hari pemanasan garis dasar
            ev = [e for e in peristiwa(jam_padam(jam)) if e["mulai"] >= dari]
            io = peristiwa_ioda(kode, dari, hingga)
        except Exception as e:
            print(f"  wilayah {kode}: {e}", file=sys.stderr); gagal.append(kode); continue
        json.dump(cache, open(pc + ".tmp", "w"), separators=(",", ":")); os.replace(pc + ".tmp", pc)
        for e in ev:
            e["prov"] = prov; e["wilayah"] = kode; e["tanggal"] = hari_wib(e["mulai"])
        ev_semua += ev
        tindih = sum(any(a < e["mulai"] + e["jam"] * 3600 and e["mulai"] < b for a, b in io) for e in ev)
        ioda_kena = sum(any(e["mulai"] < b and a < e["mulai"] + e["jam"] * 3600 for e in ev) for a, b in io)
        hasil_wil[prov] = {"wilayah_ioda": kode, "peristiwa": len(ev), "jam_total": sum(e["jam"] for e in ev), "ioda_resmi": len(io),
                           "presisi_vs_ioda": round(tindih / len(ev), 2) if ev else None, "recall_vs_ioda": round(ioda_kena / len(io), 2) if io else None,
                           "z_terakhir": round(next((z for h, z, t in reversed(jam_padam(jam)) if h >= hingga // 3600 - 24), 0), 1)}
    # label harian per provinsi: ada awal padam di hari itu
    tgl = [(dt.datetime.fromtimestamp(dari, WIB).date() + dt.timedelta(days=i)).isoformat() for i in range(hari)]
    padam = {p: [False] * hari for p in hasil_wil}
    for e in ev_semua:
        if e["tanggal"] in tgl and e["prov"] in padam:
            padam[e["prov"]][tgl.index(e["tanggal"])] = True
    bahaya = {p: [False] * hari for p in hasil_wil}
    tidx = {t: i for i, t in enumerate(tgl)}
    bahaya_jenis = ("Banjir", "Banjir Bandang", "Banjir dan Tanah Longsor", "Tanah Longsor", "Gempabumi", "Cuaca Ekstrem", "Angin Kencang", "Gerakan Tanah")
    for k in kejadian:
        i = tidx.get(k["tanggal"])
        if i is not None and k["prov_kode"] in bahaya and k["jenis"] in bahaya_jenis:
            for j in (i, i + 1):
                if j < hari:
                    bahaya[k["prov_kode"]][j] = True
    dibi_dari = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))["dari"]
    sub = {p: [i for i, t in enumerate(tgl) if t >= dibi_dari] for p in bahaya}  # DIBI hanya 365 hari
    b2 = {p: [bahaya[p][i] for i in sub[p]] for p in bahaya}
    p2 = {p: [padam[p][i] for i in sub[p]] for p in bahaya}
    hub = uji_geser(b2, p2) if len(hasil_wil) > 5 and len(sub[next(iter(sub))]) > 30 else None
    if hub:
        hub["vonis"] = "ADA HUBUNGAN" if hub["odds_ratio"] > 1 and hub["p_geser"] < 0.05 else "TIDAK TERBUKTI"
    simp = _mod("kejadian").simpan
    simp(os.path.join(AKAR, "public/data/internet_padam.json"), {
        "sumber": "IODA v2 (Georgia Tech, sinyal ping-slash24 per region)", "atribusi": "(c) Georgia Tech Research Corporation, IODA https://ioda.inetintel.cc.gatech.edu",
        "dari": tgl[0], "sampai": tgl[-1],
        "aturan": {"z_ambang": Z_AMBANG, "turun_min": TURUN_MIN, "jam_min": JAM_MIN, "dasar": "median jam-sama 7 hari sebelumnya"},
        "catatan": "Peristiwa padam = penurunan blok /24 yang menjawab ping, BUKAN bukti listrik/seluler mati (bisa ganti routing/ISP). Label riwayat untuk menara.py.",
        "wilayah_gagal": gagal, "per_provinsi": hasil_wil, "hubungan_bahaya_padam": hub,
        "peristiwa": sorted(({k: e[k] for k in ("prov", "tanggal", "mulai", "jam", "z_min", "turun_maks")} for e in ev_semua), key=lambda x: -x["mulai"])[:3000]})
    print(f"internet_padam: {len(ev_semua)} peristiwa, {len(hasil_wil)} provinsi, gagal {gagal}; hubungan: {hub}")


def uji():
    jam = {h: 1000 for h in range(24 * 10)}
    jam[24 * 9 + 5] = jam[24 * 9 + 6] = 100  # padam 2 jam
    jam[24 * 8 + 3] = 100  # 1 jam saja: bukan peristiwa
    ev = peristiwa(jam_padam(jam))
    assert len(ev) == 1 and ev[0]["jam"] == 2 and ev[0]["mulai"] == (24 * 9 + 5) * 3600, ev
    assert per_jam([1, 3, 5, None, 2, 2], 0, 600)[0] == 2
    assert odds(10, 10, 10, 10) == 1.0
    # padam selalu tepat pada hari bahaya -> OR besar, p kecil; independen -> p besar
    r = random.Random(3)
    b = {"a": [r.random() < .1 for _ in range(200)], "b": [r.random() < .1 for _ in range(200)]}
    assert uji_geser(b, {k: list(v) for k, v in b.items()}, n=300)["p_geser"] < 0.05
    assert uji_geser(b, {k: [r.random() < .1 for _ in range(200)] for k in b}, n=300)["p_geser"] > 0.02
    print("uji internet_padam: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else jalan(int(a[a.index("--hari") + 1]) if "--hari" in a else 365)
