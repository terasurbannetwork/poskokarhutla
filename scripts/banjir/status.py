"""Status banjir dan longsor per kecamatan, hari ini..+3 -> public/banjir/data/status.json + public/banjir/data/meta.json

Masukan per kecamatan (titik berat): sel hujan.json terdekat, bahaya.json (InaRISK), titik sungai.json terdekat <= 25 km,
titik hujan_ansambel.json terdekat (kotak 1 derajat, <= 1 derajat; boleh tidak ada).
Untuk hari d (0 = hari ini): H3 = jumlah hujan 3 hari d-1, d, d+1 (GESER = -1; untuk d = 0 hari kemarin adalah hujan teramati
model, hujan.json memuat 3 hari lalu);
RK = kelas sungai dari debit kendali tertinggi hari d..d+2 terhadap Q2/Q5/Q20 titik itu;
I = intensitas hujan per jam terbesar di jendela H3 (mm/jam, hujan.json imax); C = CAPE maks di jendela H3 (J/kg);
P3 = peluang ansambel ECMWF jumlah 3 hari mulai hari d >= 100 mm;
JENUH = kelembapan tanah 3-27 cm hari d >= 0,45 m3/m3 DAN hujan 7 hari lalu >= 25 mm; bila sm tidak ada: A7 >= 150 mm
(A7 = hujan teramati 7 hari sebelum hari ini, tetap untuk keempat hari).
Level 0 Normal, 1 Waspada, 2 Siaga, 3 Awas; aturan pertama yang terpenuhi dari atas (B = indeks bahaya InaRISK):

BANJIR                                                  LONGSOR
  Awas    RK = 3, atau H3 >= 120 dan B >= 0,66            Awas    H3 >= 90, JENUH, B longsor >= 0,66
  Siaga   RK = 2, atau H3 >= 80 dan B >= 0,33,            Siaga   H3 >= 60, JENUH, B >= 0,66;
          atau I >= 30 dan B >= 0,33 (banjir bandang),            atau H3 >= 90 dan B >= 0,33;
          atau P3 >= 0,5 dan B >= 0,33                            atau I >= 20 dan B >= 0,66
  Waspada RK = 1, atau H3 >= 40, atau I >= 20,            Waspada H3 >= 30 dan B >= 0,33
          atau C >= 2.500 dan H3 >= 40                    Normal  selain itu
  Normal  selain itu
(C >= 2.500 dan H3 >= 40 tidak menambah apa pun di atas H3 >= 40; dipertahankan sesuai spesifikasi sebagai penanda.)
Ambang H3 = 50/100/150 x K (K_BANJIR 0,8, K_LONGSOR 0,6), jendela GESER -1 dan A7_BASAH 25: hasil uji balik terhadap kejadian
DIBI 2016-2025 (uji_balik.py, RISET-UJI-BALIK.md), dipilih di 2016-2021 dan lolos di 2022-2025 (selisih ETS di atas derau bootstrap).

Ambang sm 0,45: sm hujan.json berasal dari ECMWF IFS (best_match Open-Meteo untuk Indonesia; dicek 13 Okt 2026 sama
persis dengan models=ecmwf_ifs). Model tanah IFS (HTESSEL; Balsamo dkk. 2009 J. Hydrometeor. 10:623, ECMWF Tech. Memo 563
Tabel 2) memakai kadar air jenuh 0,403 (kasar), 0,439 (sedang), 0,430 (sedang-halus), 0,520 (halus), 0,614 (sangat halus),
0,766 (organik) dan kapasitas lapang 0,244/0,347/0,383/0,448/0,541/0,663 m3/m3. Jadi 0,45 = jenuh untuk tekstur kasar-sedang dan >= kapasitas lapang
untuk tekstur halus (lempung tropis): tanah yang tidak bisa lagi menahan air hujan tambahan. Untuk tekstur sangat halus
0,45 masih di bawah kapasitas lapang (ambang terlalu longgar di sana). Nilai sm model, bukan pengukuran lapangan.
Intensitas I adalah rata-rata sel 0,25 derajat per jam: hujan konvektif lokal 30 mm/jam jarang muncul pada skala ini,
jadi jalur bandang konservatif (lebih sering tidak terpicu daripada salah picu).
Bahaya = indeks InaRISK tertinggi yang dicuplik di kecamatan (lihat bahaya.py). Ambang awal mengikuti kelas BMKG
(hujan sangat lebat >= 100 mm/hari, ekstrem >= 150 mm/hari) pada jumlah 3 hari; uji balik menurunkannya (hujan sel 0,25 derajat
lebih kecil dari hujan stasiun). Ambang dipilih dengan ERA5 sebagai prakiraan sempurna: bila prakiraan IFS lebih basah
daripada ERA5, status akan lebih sering naik daripada di uji balik.

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
# Hasil uji balik 2016-2025 (uji_balik.py, RISET-UJI-BALIK.md): dipilih di 2016-2021, lolos di 2022-2025.
GESER = -1                  # jendela H3/I/C hari d = d-1..d+1 (dulu d..d+2)
K_BANJIR, K_LONGSOR = 0.8, 0.6  # pengali ambang H3 50/100/150 -> banjir 40/80/120, longsor 30/60/90 mm
A7_BASAH = 25               # mm hujan 7 hari yang wajib menyertai sm >= SM_JENUH (dulu 50)


def ambang(k):
    """Ambang H3 Waspada/Siaga/Awas = 50/100/150 x k, dibulatkan 0,1 mm (100 x 0,6 = 60,00000000000001 di float)."""
    return [round(t * k, 1) for t in (50, 100, 150)]


def level_banjir(h3, bahaya, rk, imax=None, cape=None, p3=None, *, k=K_BANJIR):
    """imax/cape/p3 None = jalur itu tidak dipakai (aturan lama). k = pengali ambang H3 (uji_balik.py menggesernya)."""
    imax, cape, p3 = imax or 0, cape or 0, p3 or 0
    w, s, a = ambang(k)
    if rk == 3 or (h3 >= a and bahaya >= 0.66):
        return 3
    if rk == 2 or (bahaya >= 0.33 and (h3 >= s or imax >= 30 or p3 >= 0.5)):
        return 2
    if rk == 1 or h3 >= w or imax >= 20 or (cape >= 2500 and h3 >= w):
        return 1
    return 0


def jenuh(a7, sm=None, sm_jenuh=SM_JENUH, a7_basah=A7_BASAH):
    # sm saja berperilaku seperti penanda jenis tanah (tanah liat/organik basah sepanjang tahun), jadi wajib ada hujan nyata
    # 7 hari terakhir juga. Uji 13 Okt 2026: sm >= 0,45 saja menandai 154 kecamatan bahaya tinggi di musim kemarau.
    return (sm >= sm_jenuh and a7 >= a7_basah) if sm is not None else a7 >= 150


def level_longsor(h3, a7, bahaya, sm=None, imax=None, *, k=K_LONGSOR, sm_jenuh=SM_JENUH, a7_basah=A7_BASAH):
    """sm None -> jenuh = A7 >= 150 (aturan lama). k, sm_jenuh, a7_basah: kenop uji_balik.py, bawaan = aturan berlaku."""
    jenuh_ = jenuh(a7, sm, sm_jenuh, a7_basah)
    w, s, a = ambang(k)
    if h3 >= a and jenuh_ and bahaya >= 0.66:
        return 3
    if (h3 >= s and jenuh_ and bahaya >= 0.66) or (h3 >= a and bahaya >= 0.33) or ((imax or 0) >= 20 and bahaya >= 0.66):
        return 2
    if h3 >= w and bahaya >= 0.33:
        return 1
    return 0


HORIZON = (1, 2, 3)  # 24/48/72 jam = hari ke-0, ke-0..1, ke-0..2 (hari ke-3 = ufuk keempat, di luar 72 jam)


def ambang_hujan(jenis, bahaya, jenuh_=False, k=None):
    """Ambang H3 (mm) jalur hujan untuk [Waspada, Siaga, Awas]; None = jalur hujan tertutup (bahaya/kejenuhan kurang).
    Cermin level_banjir/level_longsor tanpa jalur sungai (RK), intensitas (I) dan P3: diuji menyapu H3 di uji()."""
    w, s, a = ambang(K_BANJIR if k is None else k) if jenis == "banjir" else ambang(K_LONGSOR if k is None else k)
    if jenis == "banjir":
        return [w, s if bahaya >= 0.33 else None, a if bahaya >= 0.66 else None]
    siaga = [x for x in (a if bahaya >= 0.33 else None, s if jenuh_ and bahaya >= 0.66 else None) if x is not None]
    return [w if bahaya >= 0.33 else None, min(siaga) if siaga else None, a if jenuh_ and bahaya >= 0.66 else None]


def peluang_kec(h3a, bb, bl, jenuh_):
    """Peluang (persen bulat) status jalur hujan dari anggota ansambel.
    h3a[d][i] = H3 anggota i untuk hari d (None bila anggota tak lengkap); jenuh_[d] = tanah jenuh hari d (deterministik).
    -> {"b","l": [[W,S,A] per hari]; "hb","hl": [[W,S,A] per horizon 24/48/72 jam]}, W/S/A = peluang mencapai >= tingkat itu
    (horizon: pada SALAH SATU hari dalam jendela, dihitung per anggota). 0 bila jalur hujan tertutup. None bila tak ada anggota."""
    ok = [i for i in range(len(h3a[0])) if all(h[i] is not None for h in h3a)]
    if not ok:
        return None
    out = {}
    for nama, jenis, bahaya in (("b", "banjir", bb), ("l", "longsor", bl)):
        th = [ambang_hujan(jenis, bahaya, jenuh_[d]) for d in range(len(h3a))]

        def p(hari, lv):
            return round(100 * sum(any(th[d][lv] is not None and h3a[d][i] >= th[d][lv] for d in hari) for i in ok) / len(ok))
        out[nama] = [[p([d], lv) for lv in range(3)] for d in range(len(h3a))]
        out["h" + nama] = [[p(range(h), lv) for lv in range(3)] for h in HORIZON]
    return out


def rob_pesisir(rob, hari, kode_prov):
    """Status rob TERPISAH dari banjir (rob.json: tinggi pasang prakiraan vs ambang persentil lokasi) untuk 4 hari status.
    -> {"prov|kab|kec": {"lv": [4], "h": [4 m], "p95", "p99"}} hanya titik berambang; {} bila rob.json tak mencakup hari status."""
    if not rob or hari[0] not in rob.get("hari", []):
        return {}
    j0, out = rob["hari"].index(hari[0]), {}
    for t in rob["titik"]:
        if t.get("p95") is None or t["prov"] not in kode_prov:
            continue
        sl = slice(j0, j0 + len(hari))
        out[f"{kode_prov[t['prov']]}|{t['kab']}|{t['kec']}"] = {"lv": t["lv"][sl], "h": t["h"][sl], "p95": t["p95"], "p99": t.get("p99")}
    return out


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

    pe = e0 == 0 and ens["grid"] and "m2" in ens["grid"][0]  # peluang per anggota butuh ansambel yang mulai hari ini
    if not pe:
        print("hujan_ansambel.json tanpa sebaran anggota/basi: prakiraan72 tanpa peluang", file=sys.stderr)
    pra, n_pe = {}, 0

    def ens_terdekat(la, lo):
        e = min(ens["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)
        return e if abs(e["lat"] - la) <= 1 and abs(e["lon"] - lo) <= 1 else None

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
        h3s = [jendela(g["h"], i0 + d + GESER) for d in range(HARI)]  # hujan.json h memuat 3 hari lalu, jadi i0 - 1 ada
        a7 = g["a7"] or 0
        rks = [kelas_sungai(titik[sg]["q"], j0 + d, titik[sg]) if sg is not None else None for d in range(HARI)]
        p3 = p3_terdekat(c["lat"], c["lon"])
        lb = [level_banjir(h3s[d], b.get("banjir", 0), rks[d], puncak(g.get("imax"), i0 + d + GESER), puncak(g.get("cape"), i0 + d + GESER),
                           p3[e0 + d] if p3 and e0 + d < len(p3) else None) for d in range(HARI)]
        sm = g.get("sm") or []
        ll = [level_longsor(h3s[d], a7, b.get("longsor", 0), sm[i0 + d] if i0 + d < len(sm) else None,
                            puncak(g.get("imax"), i0 + d + GESER)) for d in range(HARI)]
        r72 = {"b": lb, "l": ll}
        e = ens_terdekat(c["lat"], c["lon"]) if pe else None
        if e:  # H3 anggota: hari 0 = hujan teramati kemarin sel kecamatan + m2; hari d >= 1 = m3[d-1] (jendela d-1..d+1 seluruhnya prakiraan)
            kemarin = (g["h"][i0 - 1] or 0) if i0 else 0
            h3a = [[None if x is None else kemarin + x for x in e["m2"]]] + e["m3"]
            pk = peluang_kec(h3a, b.get("banjir", 0), b.get("longsor", 0),
                             [jenuh(a7, sm[i0 + d] if i0 + d < len(sm) else None) for d in range(HARI)])
            if pk:
                n_pe += 1
                r72.update({"pb": pk["b"], "pl": pk["l"], "hb": pk["hb"], "hl": pk["hl"]})
        if max(lb) or max(ll) or any(v >= 5 for q in ("pb", "pl") for h in r72.get(q, []) for v in h[1:]):
            pra[k] = r72
        lama_b, lama_l = level_banjir(h3s[0], b.get("banjir", 0), rks[0], k=1), level_longsor(h3s[0], a7, b.get("longsor", 0), k=1)
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
    rob = baca(os.path.join(KELUAR, "rob.json"))
    kode = {n: k for k, n in PROVINSI.items()}
    rb = rob_pesisir(rob, hari, kode)
    simpan(os.path.join(KELUAR, "prakiraan72.json"), {
        "dibuat": sekarang.isoformat(timespec="minutes"), "hari": hari, "horizon_jam": [24 * h for h in HORIZON],
        "anggota": ens["anggota"] if pe else None, "kec_dihitung": n_pe, "kec": pra,
        "rob": {"kec": rb, "validasi": {"persentil": (rob or {}).get("validasi", {}).get("persentil", {}).get("p95"),
                                        "kejadian_diuji": (rob or {}).get("validasi", {}).get("kejadian_diuji")}},
        "catatan": "kec: b/l = level deterministik 4 hari (0 Normal..3 Awas); pb/pl = peluang % jalur hujan mencapai Waspada/Siaga/Awas per hari; "
                   "hb/hl = peluang pada salah satu hari dalam 24/48/72 jam. Hanya kecamatan berstatus atau berpeluang Siaga/Awas >= 5%. "
                   "Jalur sungai dan intensitas tidak punya sebaran, jadi tidak masuk peluang. rob terpisah dari banjir (validasinya sendiri)."})
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
    print(f"prakiraan72.json: {len(pra)} kec (peluang dihitung untuk {n_pe}), rob pesisir {len(rb)} titik", file=sys.stderr)
    print(f"hari ini, aturan baru vs lama: banjir {sum(beda['banjir'].values())} kec berubah {dict(beda['banjir'])}; "
          f"longsor {sum(beda['longsor'].values())} kec berubah {dict(beda['longsor'])}", file=sys.stderr)


def uji():
    assert ambang(1) == [50, 100, 150] and ambang(K_BANJIR) == [40, 80, 120] and ambang(K_LONGSOR) == [30, 60, 90]
    assert level_banjir(0, 0, 3) == 3 and level_banjir(0, 0, 2) == 2 and level_banjir(0, 0, 1) == 1
    assert level_banjir(120, 0.66, None) == 3 and level_banjir(119.9, 0.66, None) == 2
    assert level_banjir(120, 0.5, 0) == 2      # hujan ekstrem, bahaya sedang -> siaga
    assert level_banjir(80, 0.2, None) == 1    # bahaya rendah -> hanya waspada
    assert level_banjir(39.9, 1, None) == 0 and level_banjir(40, 0, None) == 1
    assert level_banjir(150, 0.66, None, k=1) == 3 and level_banjir(149.9, 0.66, None, k=1) == 2  # aturan sebelum uji balik
    assert level_longsor(90, 150, 0.7) == 3 and level_longsor(89.9, 150, 0.7) == 2
    assert level_longsor(90, 100, 0.7) == 2    # tanah belum jenuh -> bukan awas
    assert level_longsor(60, 150, 0.7) == 2 and level_longsor(60, 149, 0.7) == 1  # 60 tepat: ambang dibulatkan, bukan 60,00000000000001
    assert level_longsor(200, 300, 0.2) == 0   # di luar zona bahaya longsor
    assert jendela([1, None, 2, 50], 1) == 52
    # jalur baru
    assert level_banjir(10, 0.33, None, imax=30) == 2 and level_banjir(10, 0.2, None, imax=30) == 1   # bandang butuh bahaya
    assert level_banjir(10, 0, None, imax=20) == 1 and level_banjir(10, 0, None, imax=19.9, cape=3000) == 0
    assert level_banjir(60, 0.4, None, p3=0.5) == 2 and level_banjir(60, 0.2, None, p3=0.9) == 1
    assert level_longsor(60, 25, 0.7, sm=0.46) == 2 and level_longsor(60, 24.9, 0.7, sm=0.46) == 1  # sm + hujan nyata >= 25 mm
    assert level_longsor(60, 300, 0.7, sm=0.40) == 1
    assert level_longsor(60, 0, 0.7, sm=0.60) == 1  # tanah basah sepanjang tahun tanpa hujan 7 hari: tidak dianggap jenuh
    assert level_longsor(90, 25, 0.7, sm=0.45) == 3 and level_longsor(10, 0, 0.7, imax=20) == 2 and level_longsor(10, 0, 0.5, imax=40) == 0
    assert level_longsor(29.9, 0, 0.7) == 0 and level_longsor(30, 0, 0.33) == 1 and GESER == -1
    assert puncak([None, 5, 30, 2], 1) == 30 and puncak(None, 0) is None and puncak([None], 0) is None
    t = {"q2": 100, "q5": 150, "q20": 200}
    assert kelas_sungai([0, 0, 90, 160, 120], 2, t) == 2 and kelas_sungai([None] * 5, 0, t) is None
    assert kelas_sungai([500], 0, {"q2": None}) is None
    assert abs(km(0, 0, 0, 1) - 111.19) < 0.1
    # ambang_hujan = level_* pada jalur hujan saja: menyapu H3, bahaya dan kejenuhan; menyimpang = peluang bicara aturan lain
    for h3 in [x / 2 for x in range(0, 400)]:
        for bh in (0, .2, .33, .5, .66, 1):
            th = ambang_hujan("banjir", bh)
            for lv in range(3):
                assert (level_banjir(h3, bh, None) >= lv + 1) == (th[lv] is not None and h3 >= th[lv]), ("banjir", h3, bh, lv)
            for jn in (False, True):
                th = ambang_hujan("longsor", bh, jn)
                a7 = 100 if jn else 0
                for lv in range(3):
                    assert (level_longsor(h3, a7, bh, 0.5) >= lv + 1) == (th[lv] is not None and h3 >= th[lv]), ("longsor", h3, bh, jn, lv)
    assert jenuh(25, .45) and not jenuh(24.9, .45) and jenuh(150) and not jenuh(149)
    # peluang_kec: 4 anggota, hari 0..3; anggota 3 tak lengkap pada hari 2 dibuang dari semua
    h3a = [[10, 50, 90, 130], [10, 10, 10, 10], [85, 10, 10, 90], [10, 10, None, 10]]  # baris = hari, kolom = anggota
    pk = peluang_kec(h3a, .5, .7, [True] * 4)  # anggota 2 dibuang (None di hari 3): sisa 3 anggota
    assert pk["b"][0] == [67, 33, 0], pk["b"]    # hari 0 = 10, 50, 130: >= 40 -> 2/3, >= 80 -> 1/3, awas butuh bahaya 0,66
    assert pk["l"][0] == [67, 33, 33], pk["l"]   # longsor jenuh, bahaya 0,7: waspada 30, siaga min(60, 90) = 60, awas 90
    assert pk["hb"][0] == pk["b"][0] and pk["hb"][2][1] == 67, pk["hb"]  # 72 jam: anggota 130 (hari 0) dan 85 (hari 2) lolos >= 80
    assert peluang_kec([[None], [None], [None], [None]], .5, .5, [False] * 4) is None
    z = peluang_kec([[500]] * 4, 0, 0, [True] * 4)  # bahaya 0: Siaga/Awas tertutup, Waspada banjir tak butuh bahaya, longsor butuh
    assert all(h == [100, 0, 0] for h in z["b"]) and all(h == [0, 0, 0] for h in z["l"]), z
    rob = {"hari": ["a", "b", "c", "d", "e"], "titik": [{"prov": "Jawa Barat", "kab": "K", "kec": "X", "p95": 1.5, "p99": 1.8, "lv": [0, 1, 2, 0, 0], "h": [1, 1.6, 1.9, 1, 1]},
                                                       {"prov": "Jawa Barat", "kab": "K", "kec": "Y", "p95": None, "lv": [None] * 5, "h": [None] * 5}]}
    r = rob_pesisir(rob, ["b", "c", "d", "e"], {"Jawa Barat": "32"})
    assert list(r) == ["32|K|X"] and r["32|K|X"]["lv"] == [1, 2, 0, 0] and r["32|K|X"]["h"][0] == 1.6, r
    assert rob_pesisir(rob, ["z"], {"Jawa Barat": "32"}) == {} and rob_pesisir(None, ["b"], {}) == {}
    print("ok status")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
