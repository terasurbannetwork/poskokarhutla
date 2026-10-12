"""Status banjir dan longsor per kecamatan, hari ini..+3 -> public/banjir/data/status.json + public/banjir/data/meta.json

Masukan per kecamatan (titik berat): sel hujan.json terdekat, bahaya.json (InaRISK), titik sungai.json terdekat <= 25 km,
titik hujan_ansambel.json terdekat (kotak 1 derajat, <= 1 derajat; boleh tidak ada).
Untuk hari d (0 = hari ini): H3 = jumlah prakiraan hujan 3 hari mulai hari d (d, d+1, d+2);
RK = kelas sungai dari debit kendali tertinggi di jendela yang sama terhadap Q2/Q5/Q20 titik itu;
I = intensitas hujan per jam terbesar di jendela yang sama (mm/jam, hujan.json imax); C = CAPE maks di jendela (J/kg);
P3 = peluang ansambel ECMWF jumlah 3 hari mulai hari d >= 100 mm;
JENUH = kelembapan tanah 3-27 cm hari d (awal jendela) >= 0,45 m3/m3 DAN hujan 7 hari lalu >= 50 mm; bila sm tidak ada: A7 >= 150 mm
(A7 = hujan teramati 7 hari sebelum hari ini, tetap untuk keempat hari).
Level 0 Normal, 1 Waspada, 2 Siaga, 3 Awas; aturan pertama yang terpenuhi dari atas (B = indeks bahaya InaRISK):

BANJIR                                                  LONGSOR
  Awas    RK = 3, atau H3 >= 150 dan B >= 0,66            Awas    H3 >= 150, JENUH, B longsor >= 0,66
  Siaga   RK = 2, atau H3 >= 100 dan B >= 0,33,           Siaga   H3 >= 100, JENUH, B >= 0,66;
          atau I >= 30 dan B >= 0,33 (banjir bandang),            atau H3 >= 150 dan B >= 0,33;
          atau P3 >= 0,5 dan B >= 0,33                            atau I >= 20 dan B >= 0,66
  Waspada RK = 1, atau H3 >= 50, atau I >= 20,            Waspada H3 >= 50 dan B >= 0,33
          atau C >= 2.500 dan H3 >= 50                    Normal  selain itu
  Normal  selain itu
(C >= 2.500 dan H3 >= 50 tidak menambah apa pun di atas H3 >= 50; dipertahankan sesuai spesifikasi sebagai penanda.)

Ambang sm 0,45: sm hujan.json berasal dari ECMWF IFS (best_match Open-Meteo untuk Indonesia; dicek 13 Okt 2026 sama
persis dengan models=ecmwf_ifs). Model tanah IFS (HTESSEL; Balsamo dkk. 2009 J. Hydrometeor. 10:623, ECMWF Tech. Memo 563
Tabel 2) memakai kadar air jenuh 0,403 (kasar), 0,439 (sedang), 0,430 (sedang-halus), 0,520 (halus), 0,614 (sangat halus),
0,766 (organik) dan kapasitas lapang 0,244/0,347/0,383/0,448/0,541/0,663 m3/m3. Jadi 0,45 = jenuh untuk tekstur kasar-sedang dan >= kapasitas lapang
untuk tekstur halus (lempung tropis): tanah yang tidak bisa lagi menahan air hujan tambahan. Untuk tekstur sangat halus
0,45 masih di bawah kapasitas lapang (ambang terlalu longgar di sana). Nilai sm model, bukan pengukuran lapangan.
Intensitas I adalah rata-rata sel 0,25 derajat per jam: hujan konvektif lokal 30 mm/jam jarang muncul pada skala ini,
jadi jalur bandang konservatif (lebih sering tidak terpicu daripada salah picu).
Bahaya = indeks InaRISK tertinggi yang dicuplik di kecamatan (lihat bahaya.py). Ambang hujan mengikuti kelas BMKG
(hujan sangat lebat >= 100 mm/hari, ekstrem >= 150 mm/hari) yang di sini diterapkan pada jumlah 3 hari, jadi konservatif
untuk hujan yang menyebar dan longgar untuk hujan sehari yang sangat lebat. Belum diuji balik terhadap kejadian BNPB.

status.json: {"hari": [4 tanggal], "kec": {"prov|kab|kec": {"b": [4 level], "l": [4 level], "h3": mm terbesar dari 4 jendela,
              "a7": mm, "sg": indeks titik sungai.json atau null}}}  -- hanya kecamatan dengan level > 0.
Pakai:  python3 scripts/data/status.py        |  python3 scripts/data/status.py uji
"""
import datetime as dt, math, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from bahaya import kecamatan
from umum import KELUAR, WIB, baca, simpan
from wilayah import PROVINSI

STATUS = ["Normal", "Waspada", "Siaga", "Awas"]
HARI = 4
RADIUS_SUNGAI_KM = 25


SM_JENUH = 0.45  # m3/m3, lihat docstring


def level_banjir(h3, bahaya, rk, imax=None, cape=None, p3=None):
    """imax/cape/p3 None = jalur itu tidak dipakai (aturan lama)."""
    imax, cape, p3 = imax or 0, cape or 0, p3 or 0
    if rk == 3 or (h3 >= 150 and bahaya >= 0.66):
        return 3
    if rk == 2 or (bahaya >= 0.33 and (h3 >= 100 or imax >= 30 or p3 >= 0.5)):
        return 2
    if rk == 1 or h3 >= 50 or imax >= 20 or (cape >= 2500 and h3 >= 50):
        return 1
    return 0


def level_longsor(h3, a7, bahaya, sm=None, imax=None):
    """sm None -> jenuh = A7 >= 150 (aturan lama)."""
    # sm saja berperilaku seperti penanda jenis tanah (tanah liat/organik basah sepanjang tahun), jadi wajib ada hujan nyata
    # 7 hari terakhir juga (>= 50 mm). Uji 13 Okt 2026: sm >= 0,45 saja menandai 154 kecamatan bahaya tinggi di musim kemarau.
    jenuh = (sm >= SM_JENUH and a7 >= 50) if sm is not None else a7 >= 150
    if h3 >= 150 and jenuh and bahaya >= 0.66:
        return 3
    if (h3 >= 100 and jenuh and bahaya >= 0.66) or (h3 >= 150 and bahaya >= 0.33) or ((imax or 0) >= 20 and bahaya >= 0.66):
        return 2
    if h3 >= 50 and bahaya >= 0.33:
        return 1
    return 0


def jendela(xs, mulai, n=3):
    return round(sum(x or 0 for x in xs[mulai:mulai + n]), 1)


def puncak(xs, mulai, n=3):
    """Maksimum xs[mulai:mulai+n]; None bila tidak ada data (berkas hujan.json lama tanpa medan ini)."""
    ada = [x for x in (xs or [])[mulai:mulai + n] if x is not None]
    return max(ada) if ada else None


def kelas_sungai(q, mulai, t):
    """Kelas dari debit kendali tertinggi q[mulai:mulai+3] terhadap ambang titik t; None bila tak ada ambang/data."""
    ada = [x for x in q[mulai:mulai + 3] if x is not None]
    if not ada or not t.get("q2"):
        return None
    p = max(ada)
    return 3 if p >= t["q20"] else 2 if p >= t["q5"] else 1 if p >= t["q2"] else 0


def km(la1, lo1, la2, lo2):
    x = math.radians(lo2 - lo1) * math.cos(math.radians((la1 + la2) / 2))
    return 6371 * math.hypot(x, math.radians(la2 - la1))


def main():
    hujan, sungai, bahaya = baca(os.path.join(KELUAR, "hujan.json")), baca(os.path.join(KELUAR, "sungai.json")), baca(os.path.join(KELUAR, "bahaya.json"))
    if not hujan:
        sys.exit("hujan.json belum ada")
    sel = hujan["sel"]
    i0 = hujan["hari"].index(hujan["hari_ini"])
    hari = hujan["hari"][i0:i0 + HARI]
    petak = {(math.floor(g["lat"] / sel), math.floor(g["lon"] / sel)): g for g in hujan["grid"]}
    titik = (sungai or {}).get("titik", [])
    j0 = sungai["hari"].index(hujan["hari_ini"]) if sungai and hujan["hari_ini"] in sungai["hari"] else 3
    bh = (bahaya or {}).get("kec", {})
    ens = baca(os.path.join(KELUAR, "hujan_ansambel.json"))
    e0 = ens["hari"].index(hujan["hari_ini"]) if ens and hujan["hari_ini"] in ens["hari"] else None
    if e0 is None:
        print("hujan_ansambel.json tidak ada/basi: jalur P3 tidak dipakai", file=sys.stderr)
    if not bh:
        print("PERINGATAN: bahaya.json kosong, indeks bahaya dianggap 0", file=sys.stderr)

    def sel_terdekat(la, lo):
        gy, gx = math.floor(la / sel), math.floor(lo / sel)
        if (gy, gx) in petak:
            return petak[(gy, gx)]
        dekat = [petak[k] for k in ((gy + a, gx + b) for a in (-1, 0, 1) for b in (-1, 0, 1)) if k in petak]
        return min(dekat or hujan["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)

    def p3_terdekat(la, lo):
        if e0 is None:
            return None
        e = min(ens["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)
        return e["p3"] if abs(e["lat"] - la) <= 1 and abs(e["lon"] - lo) <= 1 else None

    out, hitung = {}, {"banjir": [Counter() for _ in range(HARI)], "longsor": [Counter() for _ in range(HARI)]}
    beda = {"banjir": Counter(), "longsor": Counter()}  # hari ini: aturan baru vs lama
    for k, c in kecamatan().items():
        g = sel_terdekat(c["lat"], c["lon"])
        b = bh.get(k, {})
        sg, jarak = None, RADIUS_SUNGAI_KM
        for i, t in enumerate(titik):
            if abs(t["lat"] - c["lat"]) < 0.25 and abs(t["lon"] - c["lon"]) < 0.25:
                d = km(c["lat"], c["lon"], t["lat"], t["lon"])
                if d <= jarak:
                    sg, jarak = i, d
        h3s = [jendela(g["h"], i0 + d) for d in range(HARI)]
        a7 = g["a7"] or 0
        rks = [kelas_sungai(titik[sg]["q"], j0 + d, titik[sg]) if sg is not None else None for d in range(HARI)]
        p3 = p3_terdekat(c["lat"], c["lon"])
        lb = [level_banjir(h3s[d], b.get("banjir", 0), rks[d], puncak(g.get("imax"), i0 + d), puncak(g.get("cape"), i0 + d),
                           p3[e0 + d] if p3 and e0 + d < len(p3) else None) for d in range(HARI)]
        sm = g.get("sm") or []
        ll = [level_longsor(h3s[d], a7, b.get("longsor", 0), sm[i0 + d] if i0 + d < len(sm) else None,
                            puncak(g.get("imax"), i0 + d)) for d in range(HARI)]
        lama_b, lama_l = level_banjir(h3s[0], b.get("banjir", 0), rks[0]), level_longsor(h3s[0], a7, b.get("longsor", 0))
        if lb[0] != lama_b:
            beda["banjir"][f"{STATUS[lama_b]}->{STATUS[lb[0]]}"] += 1
        if ll[0] != lama_l:
            beda["longsor"][f"{STATUS[lama_l]}->{STATUS[ll[0]]}"] += 1
        for d in range(HARI):
            hitung["banjir"][d][lb[d]] += 1
            hitung["longsor"][d][ll[d]] += 1
        if max(lb) or max(ll):
            out[k] = {"b": lb, "l": ll, "h3": max(h3s), "a7": a7, "sg": sg}
    simpan(os.path.join(KELUAR, "status.json"), {"hari": hari, "kec": out})
    sekarang = dt.datetime.now(WIB)
    simpan(os.path.join(KELUAR, "meta.json"), {
        "dibuat": sekarang.isoformat(timespec="minutes"), "hari_wib": hujan["hari_ini"], "hari": hari,
        "provinsi": PROVINSI, "status": STATUS,
        "hitung": {z: [v[0][3], v[0][2], v[0][1]] for z, v in hitung.items()},  # hari ini: [awas, siaga, waspada]
        "hitung_harian": {z: [[c[3], c[2], c[1]] for c in v] for z, v in hitung.items()},
        "jumlah_kec": sum(hitung["banjir"][0].values()),
        "sumber": {"hujan": "Open-Meteo forecast (best match), kisi 0,25 derajat", "ansambel": "ECMWF IFS ENS via Open-Meteo", "sungai": "GloFAS v4 via Open-Meteo Flood API",
                   "bahaya": "InaRISK BNPB", "kejadian": "BNPB data.bnpb.go.id"},
        "titik_sungai": len(titik), "titik_sungai_berambang": sum(1 for t in titik if t.get("q2"))})
    print(f"status.json: {len(out)} kec berstatus > 0 dari {sum(hitung['banjir'][0].values())}; hari ini banjir "
          f"{dict(hitung['banjir'][0])}, longsor {dict(hitung['longsor'][0])}", file=sys.stderr)
    print(f"hari ini, aturan baru vs lama: banjir {sum(beda['banjir'].values())} kec berubah {dict(beda['banjir'])}; "
          f"longsor {sum(beda['longsor'].values())} kec berubah {dict(beda['longsor'])}", file=sys.stderr)


def uji():
    assert level_banjir(0, 0, 3) == 3 and level_banjir(0, 0, 2) == 2 and level_banjir(0, 0, 1) == 1
    assert level_banjir(150, 0.66, None) == 3
    assert level_banjir(150, 0.5, 0) == 2      # hujan ekstrem, bahaya sedang -> siaga
    assert level_banjir(100, 0.2, None) == 1   # bahaya rendah -> hanya waspada
    assert level_banjir(49.9, 1, None) == 0
    assert level_longsor(150, 150, 0.7) == 3
    assert level_longsor(150, 100, 0.7) == 2   # tanah belum jenuh -> bukan awas
    assert level_longsor(100, 150, 0.7) == 2 and level_longsor(100, 149, 0.7) == 1
    assert level_longsor(200, 300, 0.2) == 0   # di luar zona bahaya longsor
    assert jendela([1, None, 2, 50], 1) == 52
    # jalur baru
    assert level_banjir(10, 0.33, None, imax=30) == 2 and level_banjir(10, 0.2, None, imax=30) == 1   # bandang butuh bahaya
    assert level_banjir(10, 0, None, imax=20) == 1 and level_banjir(10, 0, None, imax=19.9, cape=3000) == 0
    assert level_banjir(60, 0.4, None, p3=0.5) == 2 and level_banjir(60, 0.2, None, p3=0.9) == 1
    assert level_longsor(100, 60, 0.7, sm=0.46) == 2 and level_longsor(100, 300, 0.7, sm=0.40) == 1  # sm + hujan nyata
    assert level_longsor(100, 0, 0.7, sm=0.60) == 1  # tanah basah sepanjang tahun tanpa hujan 7 hari: tidak dianggap jenuh
    assert level_longsor(150, 60, 0.7, sm=0.45) == 3 and level_longsor(10, 0, 0.7, imax=20) == 2 and level_longsor(10, 0, 0.5, imax=40) == 0
    assert puncak([None, 5, 30, 2], 1) == 30 and puncak(None, 0) is None and puncak([None], 0) is None
    t = {"q2": 100, "q5": 150, "q20": 200}
    assert kelas_sungai([0, 0, 90, 160, 120], 2, t) == 2 and kelas_sungai([None] * 5, 0, t) is None
    assert kelas_sungai([500], 0, {"q2": None}) is None
    assert abs(km(0, 0, 0, 1) - 111.19) < 0.1
    print("ok status")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
