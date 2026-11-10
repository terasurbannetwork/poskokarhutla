#!/usr/bin/env python3
"""Tsunami per zona (Silang Sumber F2, SS-10 sampai SS-12): kamus zona BMKG -> kabupaten/kota, tingkat tertinggi per kabupaten,
eksposur, pengukuran muka air dari teks judul, garis waktu buletin.

Masukan (semua berkas lokal, tanpa jaringan): public/gempa/data/inatews_tsunami.json (arsip buletin BMKG, milik inatews.py),
public/data/wilayah/indeks.json (kode Kemendagri 4 digit), public/data/penduduk.json, sekolah.json, fasilitas.json,
public/banjir/data/pusat_kec.json, public/cuaca/data/evakuasi_tsunami.json.
Keluaran: public/gempa/data/zona_tsunami_kamus.json dan tsunami_zona.json. Deterministik (dibuat = jam arsip, bukan jam jalan).

Aturan (KEPUTUSAN K2, K4): tingkat resmi BMKG dipakai apa adanya; satu kabupaten di banyak zona = tingkat TERTINGGI (tidak dirata-rata).
Zona yang tak cocok tetap tampil dengan nama aslinya (belum_dipetakan). "BAGIAN UTARA" dan "PULAU X" = sebagian garis pantai (sebagian: true).
Eksposur = seluruh kabupaten, BUKAN penduduk di zona rendah. Data tak ada = null ("belum ada data"), bukan nol.
Kamus dibuat dari aturan nama dan BELUM ditinjau manusia (ditinjau: false).
Python 3.9+ stdlib. Pakai: python3 scripts/gempa/tsunami_zona.py [jalan]   |   python3 scripts/gempa/tsunami_zona.py uji"""
import json
import math
import os
import re
import sys
from datetime import datetime, timedelta, timezone

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.path.join(AKAR, "public/gempa/data")
WIB = timezone(timedelta(hours=7))
URUT = {"WASPADA": 1, "SIAGA": 2, "AWAS": 3}
# awalan kode provinsi Kemendagri yang boleh dicari tiap singkatan provinsi BMKG (pemekaran: Kaltara, Papua Barat Daya, dst.)
PROV_KODE = {"GORONTALO": ("75",), "KALTIM": ("64", "65"), "MALUT": ("82",), "NTB": ("52",), "NTT": ("53",), "PAPUA": ("91", "93", "94", "95"),
             "PAPUABAR": ("92", "96"), "SULSEL": ("73", "76"), "SULTENG": ("72",), "SULTRA": ("74",), "SULUT": ("71",)}
ALIAS = {"selayar": "kepulauanselayar", "tidore": "tidorekepulauan", "kepsiautagulandangbiaro": "kepulauansiautagulandangbiaro"}


def baca(rel):
    with open(os.path.join(AKAR, rel), encoding="utf-8") as f:
        return json.load(f)


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w", encoding="utf-8") as f:  # atomik
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def nk(n):
    """Nama kabupaten -> (kota?, kunci huruf-angka). 'Kab. Toli-Toli' dan 'TOLI-TOLI' sama; 'Kota Bima' beda dengan 'Bima'."""
    s = (n or "").lower().strip().replace("kep.", "kepulauan")
    kota = bool(re.match(r"^kota\b", s))
    s = re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", s)
    k = re.sub(r"[^a-z0-9]", "", s)
    return kota, ALIAS.get(k, k)


def universe(indeks, prefiks):
    """{id4: (nama, kota, kunci)} untuk provinsi berawalan prefiks."""
    o = {}
    for kid, v in indeks.items():
        if len(kid) == 4 and kid[:2] in prefiks:
            kota, k = nk(v[1])
            o[kid] = (v[1], kota, k)
    return o


# ------------------------------------------------------------------ SS-10 kamus
def cocokkan(prov, zona, indeks):
    """-> {status: cocok|sebagian|belum_dipetakan, kab: [{id, nama, sebagian}], alasan}. Pencocokan harfiah pada nama; tidak menebak."""
    prefiks = PROV_KODE.get(prov)
    if not prefiks:
        return {"status": "belum_dipetakan", "kab": [], "alasan": "provinsi %s belum ada di tabel provinsi" % prov}
    uni = universe(indeks, prefiks)
    s = zona.upper().strip()
    kota = s.startswith("KOTA-")
    if kota:
        s = s[5:]
    sebagian, alasan = False, ""
    m = re.match(r"^(.*?)\s+BAGIAN\s+\w+$", s)
    if m:
        s, sebagian, alasan = m.group(1), True, "BAGIAN"

    def cari(nama, kt):
        k = nk(("Kota " if kt else "") + nama.replace("-", " "))[1]
        return [i for i, (_, kk, kx) in uni.items() if kk == kt and kx == k]
    hit = cari(s, kota)
    if not hit and not sebagian:
        # "PULAU ENDE" -> Ende sebagian; "BIMA PULAU GILI" -> Bima sebagian. Nama kabupaten berawalan Pulau (Morotai) sudah dicoba di atas.
        m = re.match(r"^PULAU\s+(.+)$", s) or re.match(r"^(.+?)\s+PULAU\s+.+$", s)
        if m:
            hit, sebagian, alasan = cari(m.group(1), kota), True, "PULAU"
    if len(hit) == 1:
        i = hit[0]
        return {"status": "sebagian" if sebagian else "cocok", "kab": [{"id": i, "nama": uni[i][0], "sebagian": sebagian}], "alasan": alasan}
    return {"status": "belum_dipetakan", "kab": [], "alasan": "nama tidak cocok dengan satu kabupaten/kota" if not hit else "nama cocok lebih dari satu kabupaten"}


def zona_unik(tsu):
    o = {}
    for k in tsu["kejadian"].values():
        for b in k["buletin"]:
            for z in b["zona"]:
                o.setdefault((z[0], z[1]), z)
    return sorted(o)


def bangun_kamus(tsu, indeks):
    zona = {}
    for prov, nama in zona_unik(tsu):
        r = cocokkan(prov, nama, indeks)
        zona["%s|%s" % (prov, nama)] = {"provinsi": prov, "nama": nama, **r}
    hit = [z["status"] for z in zona.values()]
    return {"versi": 1, "dibuat": tsu.get("dibuat"), "ditinjau": False, "sumber": "BMKG InaTEWS (nama zona); kode: Kemendagri via public/data/wilayah/indeks.json",
            "ringkas": {"zona": len(zona), "cocok": hit.count("cocok"), "sebagian": hit.count("sebagian"), "belum_dipetakan": hit.count("belum_dipetakan")},
            "belum_dipetakan": [z["provinsi"] + "|" + z["nama"] for z in zona.values() if z["status"] == "belum_dipetakan"],
            "catatan": ["Dibuat dari aturan nama, belum ditinjau manusia.",
                        "sebagian = zona menunjuk sebagian garis pantai kabupaten (BAGIAN UTARA, PULAU X); kamus menulis kabupaten induknya.",
                        "Zona belum_dipetakan tetap tampil di layar dengan nama aslinya dan tingkat resminya."],
            "zona": zona}


# ------------------------------------------------------------------ SS-12 ukur dan garis waktu
UKUR = re.compile(r"([^()]+?)\((\d{1,2}:\d{2})\s*WIB\)\s*(\d+(?:\.\d+)?)\s*m\b")


def urai_ukur(judul):
    """Teks judul 'terdeteksi di A,X(08:16WIB)0.3m, B(..)..' -> [{stasiun, jam, tinggi_m, teks}]. Yang tak terurai pasti tidak ditebak:
    bila jumlah 'WIB)' tak sama dengan jumlah yang terurai, sisa teks disimpan di 'tidak_terurai'."""
    j = judul or ""
    a = re.search(r"terdeteksi di", j, re.I)
    if not a:
        return [], None
    tail = j[a.end():].split("::")[0]
    o = []
    for m in UKUR.finditer(tail):
        o.append({"stasiun": m.group(1).strip(" ,"), "jam": m.group(2).rjust(5, "0"), "tinggi_m": float(m.group(3)), "teks": m.group(0).strip(" ,")})
    sisa = None if len(o) == len(re.findall(r"WIB\)", tail)) else tail.strip()
    return o, sisa


def wib_teks(ep):
    return datetime.fromtimestamp(ep, WIB).strftime("%Y-%m-%d %H:%M")


def tinggi_tertinggi(daftar):
    return max(daftar, key=lambda x: (URUT.get(x, 0)), default=None)


def per_kab(zonas, kamus):
    """zonas [[prov, nama, tingkat, epoch]] -> {id kab: {tingkat_tertinggi, zona:[nama], sebagian: bool}}. TERTINGGI, bukan rata-rata."""
    o = {}
    for p, n, t, ep in zonas:
        e = kamus["zona"].get(p + "|" + n)
        for k in (e or {}).get("kab", []):
            x = o.setdefault(k["id"], {"nama": k["nama"], "tingkat_tertinggi": t, "zona": [], "sebagian": True, "sebagian_tingkat": k["sebagian"]})
            if URUT.get(t, 0) > URUT.get(x["tingkat_tertinggi"], 0):
                x["tingkat_tertinggi"], x["sebagian_tingkat"] = t, k["sebagian"]
            elif t == x["tingkat_tertinggi"]:
                x["sebagian_tingkat"] = x["sebagian_tingkat"] and k["sebagian"]  # sebagian hanya bila SEMUA zona penentu tingkat itu sebagian
            x["zona"].append(n)
            x["sebagian"] = x["sebagian"] and k["sebagian"]
    return o


def garis_waktu(buletin, kamus):
    """Per buletin: keadaan lengkap (zona, kab, ukur) dan perubahan terhadap buletin sebelumnya."""
    o, sebelum = [], None
    for b in sorted(buletin, key=lambda x: x["terbit"]):
        ukur, sisa = urai_ukur(b.get("judul"))
        zona = [{"provinsi": z[0], "nama": z[1], "tingkat": z[2], "epoch": z[3], "dipetakan": kamus["zona"].get(z[0] + "|" + z[1], {}).get("status", "belum_dipetakan") != "belum_dipetakan"} for z in b["zona"]]
        kab = per_kab(b["zona"], kamus)
        ini = {(z["provinsi"], z["nama"]): z["tingkat"] for z in zona}
        sblm = sebelum["ini"] if sebelum else {}
        ch = {"zona_baru": len([k for k in ini if k not in sblm]), "zona_hilang": len([k for k in sblm if k not in ini]),
              "naik_tingkat": len([k for k in ini if k in sblm and URUT.get(ini[k], 0) > URUT.get(sblm[k], 0)]),
              "m_sebelum": sebelum["m"] if sebelum else None, "ukur_baru": max(0, len(ukur) - (len(sebelum["ukur"]) if sebelum else 0))}
        o.append({"id": b["id"], "terbit": b["terbit"], "terbit_wib": wib_teks(b["terbit"]), "subjek": b["subjek"], "m": b["m"], "n_zona": len(zona), "berakhir": bool(b.get("berakhir")),
                  "zona": zona, "kab": {k: {"tingkat": v["tingkat_tertinggi"], "zona": v["zona"], "sebagian": v["sebagian"], "sebagian_tingkat": v["sebagian_tingkat"]} for k, v in kab.items()},
                  "ukur": ukur, "tidak_terurai": sisa, "produk": b.get("produk", []), "perubahan": ch, "judul": b.get("judul")})
        sebelum = {"ini": ini, "m": b["m"], "ukur": ukur}
    return o


# ------------------------------------------------------------------ SS-11 eksposur
def jarak(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def eksposur(ids, indeks):
    """{id: {penduduk, sekolah, faskes, evakuasi}} (null = belum ada data) dan peta sumber. Seluruh kabupaten."""
    ids = set(ids)
    kunci = {(i[:2], nk(indeks[i][1])[1], nk(indeks[i][1])[0]): i for i in ids}  # (prov2, kunci nama, kota?) -> id; Bima dan Kota Bima tidak bertabrakan

    def cari_id(p, kab):
        kota, k = nk(kab)
        return kunci.get((p, k, kota))
    out = {i: {"penduduk": None, "sekolah": None, "faskes": None, "evakuasi": None} for i in ids}

    pend = baca("public/data/penduduk.json")["kec"]
    adaprov = set()
    for k, v in pend.items():
        p, kab, _ = k.split("|", 2)
        adaprov.add(p)
        i = cari_id(p, kab)
        if i:
            out[i]["penduduk"] = (out[i]["penduduk"] or 0) + v
    pusat = baca("public/banjir/data/pusat_kec.json")
    pk = []  # SEMUA pusat kecamatan (lat, lon, id kabupaten atau None, prov): titik dekat kabupaten lain tidak dicuri
    for k, v in pusat.items():
        p, kab, _ = k.split("|", 2)
        pk.append((v[0], v[1], cari_id(p, kab), p))

    def terdekat(lat, lon, p, maks):
        b, bj = None, maks
        for la, lo, i, pp in pk:
            if (p and pp != p) or abs(la - lat) > 0.5 or abs(lo - lon) > 0.5:
                continue
            j = jarak(lat, lon, la, lo)
            if j <= bj:
                b, bj = i, j
        return b  # None bila pusat terdekat milik kabupaten yang tak dicari

    sek = baca("public/data/sekolah.json")
    provsek = {r[5] for r in sek["baris"]}
    for p in provsek:
        for i in ids:
            if i[:2] == p:
                out[i]["sekolah"] = 0
    for r in sek["baris"]:
        i = cari_id(r[5], r[6])
        if i:
            out[i]["sekolah"] += 1
    fas = [f for f in baca("public/data/fasilitas.json") if f.get("t") == "rs"]
    provfas = {f["prov"] for f in fas}
    for p in provfas:
        for i in ids:
            if i[:2] == p:
                out[i]["faskes"] = 0
    for f in fas:
        if f["prov"] in provfas:
            i = terdekat(f["lat"], f["lon"], f["prov"], 15)  # RS/puskesmas tak berkode kabupaten: pusat kecamatan terdekat (perkiraan)
            if i:
                out[i]["faskes"] += 1
    evak = {}
    for w in baca("public/cuaca/data/evakuasi_tsunami.json")["wilayah"]:
        for t in w["titik"]:
            i = terdekat(t[1], t[0], None, 25)
            if i:
                evak[i] = evak.get(i, 0) + 1
    for i, n in evak.items():
        out[i]["evakuasi"] = n
    sumber = {"penduduk": "WorldPop 2026 (public/data/penduduk.json), dijumlah per kabupaten",
              "sekolah": "Dapodik/EMIS (public/data/sekolah.json); hanya provinsi yang ada di berkas itu",
              "faskes": "OSM rumah sakit dan puskesmas (public/data/fasilitas.json), dipasang ke kabupaten lewat pusat kecamatan terdekat (perkiraan); hanya provinsi yang ada di berkas itu",
              "evakuasi": "BNPB (public/cuaca/data/evakuasi_tsunami.json), 4 wilayah rintisan; kabupaten di luarnya belum ada data"}
    return out, sumber


# ------------------------------------------------------------------ rakit
def rakit(tsu=None, kamus=None, indeks=None, dengan_eksposur=True):
    tsu = tsu or baca("public/gempa/data/inatews_tsunami.json")
    indeks = indeks or baca("public/data/wilayah/indeks.json")
    kamus = kamus or bangun_kamus(tsu, indeks)
    kej, semua_kab = {}, set()
    for kid, k in tsu["kejadian"].items():
        gw = garis_waktu(k["buletin"], kamus)
        berzona = [b for b in gw if b["zona"]]
        akhir = berzona[-1] if berzona else None
        maks = {}
        for b in gw:
            for i, v in b["kab"].items():
                if URUT.get(v["tingkat"], 0) > URUT.get(maks.get(i, ""), 0):
                    maks[i] = v["tingkat"]
        kab = {}
        if akhir:
            zl = [[z["provinsi"], z["nama"], z["tingkat"], z["epoch"]] for z in akhir["zona"]]
            for i, v in per_kab(zl, kamus).items():
                kab[i] = {"nama": v["nama"], "tingkat_tertinggi": v["tingkat_tertinggi"], "tingkat_maks_kejadian": maks.get(i), "zona": v["zona"], "sebagian": v["sebagian"], "sebagian_tingkat": v["sebagian_tingkat"], "eksposur": None}
        semua_kab.update(kab)
        ukur_best = max((b["ukur"] for b in gw), key=len, default=[])
        kej[kid] = {"t": k["t"], "t_wib": wib_teks(k["t"]), "lat": k["lat"], "lon": k["lon"], "m": k["m"], "area": k["area"],
                    "buletin_akhir_zona": akhir["id"] if akhir else None, "buletin": gw,
                    "zona": akhir["zona"] if akhir else [], "kab": kab, "ukur": ukur_best,
                    "ukur_maks_m": max([u["tinggi_m"] for u in ukur_best], default=None)}
    sumber = {}
    if dengan_eksposur and semua_kab:
        ek, sumber = eksposur(semua_kab, indeks)
        for k in kej.values():
            for i, v in k["kab"].items():
                v["eksposur"] = ek[i]
    return kamus, {"versi": 1, "dibuat": tsu.get("dibuat"), "label": "Resmi BMKG apa adanya; pemetaan zona ke kabupaten dan eksposur adalah hasil turunan Centurisk97",
                   "sumber": "BMKG InaTEWS (buletin tsunami), arsip scripts/gempa/inatews.py",
                   "catatan": ["Eksposur = seluruh kabupaten/kota, bukan penduduk di zona rendah.",
                               "null = belum ada data, bukan nol.",
                               "Tingkat per kabupaten = tertinggi dari zona yang mencakupnya, tidak dirata-rata.",
                               "epoch zona = waktu yang dicantumkan BMKG pada zona itu (perkiraan tiba)."],
                   "eksposur_sumber": sumber, "belum_dipetakan": kamus["belum_dipetakan"], "kejadian": kej}


def jalan():
    kamus, hasil = rakit()
    simpan(os.path.join(DATA, "zona_tsunami_kamus.json"), kamus)
    simpan(os.path.join(DATA, "tsunami_zona.json"), hasil)
    print("kamus:", kamus["ringkas"])
    for k, v in hasil["kejadian"].items():
        print(k, v["t_wib"], "M", v["m"], "buletin", len(v["buletin"]), "kab", len(v["kab"]), "ukur", len(v["ukur"]), "maks", v["ukur_maks_m"])


# ------------------------------------------------------------------ uji
def uji():
    ind = {"7172": ["Sulawesi Utara", "Kota Bitung"], "5310": ["Nusa Tenggara Timur", "Kab. Manggarai"], "5315": ["Nusa Tenggara Timur", "Kab. Manggarai Barat"],
           "8207": ["Maluku Utara", "Kab. Pulau Morotai"], "5272": ["Nusa Tenggara Barat", "Kota Bima"], "5206": ["Nusa Tenggara Barat", "Kab. Bima"],
           "5308": ["Nusa Tenggara Timur", "Kab. Ende"], "7204": ["Sulawesi Tengah", "Kab. Toli-Toli"], "8203": ["Maluku Utara", "Kab. Halmahera Utara"], "8201": ["Maluku Utara", "Kab. Halmahera Barat"]}
    c = cocokkan("SULUT", "KOTA-BITUNG", ind)
    assert c["status"] == "cocok" and c["kab"][0]["id"] == "7172" and not c["kab"][0]["sebagian"], c
    c = cocokkan("NTT", "MANGGARAI BAGIAN UTARA", ind)
    assert c["status"] == "sebagian" and c["kab"][0]["id"] == "5310" and c["kab"][0]["sebagian"], c
    c = cocokkan("NTT", "MANGGARAI-BARAT BAGIAN UTARA", ind)
    assert c["kab"][0]["id"] == "5315", c  # bukan Manggarai: nama penuh dicocokkan
    assert cocokkan("NTB", "KOTA-BIMA BAGIAN UTARA", ind)["kab"][0]["id"] == "5272"
    assert cocokkan("NTB", "BIMA PULAU GILI", ind)["kab"][0]["id"] == "5206" and cocokkan("NTB", "BIMA PULAU GILI", ind)["status"] == "sebagian"
    assert cocokkan("NTT", "PULAU ENDE", ind)["kab"][0]["id"] == "5308"
    assert cocokkan("MALUT", "HALMAHERA", ind)["status"] == "belum_dipetakan", "nama tanpa padanan harfiah tidak ditebak"
    assert cocokkan("SULTENG", "TOLI-TOLI", ind)["kab"][0]["id"] == "7204" and cocokkan("MALUT", "HALMAHERA-UTARA", ind)["kab"][0]["id"] == "8203"
    assert nk("Kab. Kepulauan Selayar") == nk("SELAYAR") == (False, "kepulauanselayar")
    assert cocokkan("XX", "A", ind)["status"] == "belum_dipetakan"
    # tingkat tertinggi, bukan rata-rata
    km = {"zona": {"NTT|MANGGARAI BAGIAN UTARA": cocokkan("NTT", "MANGGARAI BAGIAN UTARA", ind), "NTT|MANGGARAI": cocokkan("NTT", "MANGGARAI", ind)}}
    pk = per_kab([["NTT", "MANGGARAI BAGIAN UTARA", "WASPADA", 1], ["NTT", "MANGGARAI", "SIAGA", 2]], km)
    assert pk["5310"]["tingkat_tertinggi"] == "SIAGA" and len(pk["5310"]["zona"]) == 2 and pk["5310"]["sebagian"] is False, pk
    # kasus campuran: zona penuh WASPADA + zona sebagian SIAGA -> tingkat tertinggi ditentukan zona sebagian; dua zona sama tinggi, satu penuh -> bukan sebagian
    km2 = {"zona": {"NTT|MANGGARAI": cocokkan("NTT", "MANGGARAI", ind), "NTT|MANGGARAI BAGIAN UTARA": cocokkan("NTT", "MANGGARAI BAGIAN UTARA", ind)}}
    c1 = per_kab([["NTT", "MANGGARAI", "WASPADA", 1], ["NTT", "MANGGARAI BAGIAN UTARA", "SIAGA", 2]], km2)["5310"]
    assert c1["tingkat_tertinggi"] == "SIAGA" and c1["sebagian_tingkat"] is True and c1["sebagian"] is False, c1
    c2 = per_kab([["NTT", "MANGGARAI", "SIAGA", 1], ["NTT", "MANGGARAI BAGIAN UTARA", "SIAGA", 2]], km2)["5310"]
    assert c2["sebagian_tingkat"] is False, c2
    c3 = per_kab([["NTT", "MANGGARAI BAGIAN UTARA", "WASPADA", 1], ["NTT", "MANGGARAI", "SIAGA", 2]], km2)["5310"]
    assert c3["sebagian_tingkat"] is False, c3
    # ukur
    u, sisa = urai_ukur("Pemutakhiran Peringatan Dini, Tsunami akibat gempa Mag:7.7 (30 km X), telah terdeteksi di  MAUROLE-ENDE(05:27WIB)0.94m, SIKKA(5:03WIB)0.19m::BMKG")
    assert [(x["stasiun"], x["jam"], x["tinggi_m"]) for x in u] == [("MAUROLE-ENDE", "05:27", 0.94), ("SIKKA", "05:03", 0.19)] and sisa is None, u
    u, _ = urai_ukur("telah terdeteksi di  HANASAKI,JEPANG(08:16WIB)0.3m, KAMCHATKAPENINSULA,RUSIA(06:51WIB)0.8m::BMKG")
    assert u[0]["stasiun"] == "HANASAKI,JEPANG" and u[1]["tinggi_m"] == 0.8, u
    assert urai_ukur("Peringatan Dini TSUNAMI ... dinyatakan telah berakhir::BMKG") == ([], None)
    assert urai_ukur("telah terdeteksi di  X(05:27WIB)tinggi?m")[1] is not None, "tak terurai -> sisa teks disimpan, tidak ditebak"
    # data nyata: 60 zona unik, tiap zona dipetakan atau tercatat belum_dipetakan
    tsu, indeks = baca("public/gempa/data/inatews_tsunami.json"), baca("public/data/wilayah/indeks.json")
    kamus = bangun_kamus(tsu, indeks)
    r = kamus["ringkas"]
    assert r["zona"] == 60 and r["cocok"] + r["sebagian"] + r["belum_dipetakan"] == 60 and len(kamus["belum_dipetakan"]) == r["belum_dipetakan"], r
    assert kamus["zona"]["SULUT|KOTA-BITUNG"]["kab"][0]["id"] == "7172" and kamus["zona"]["NTT|MANGGARAI BAGIAN UTARA"]["kab"][0]["id"] == "5310"
    _, hasil = rakit(tsu, kamus, indeks, dengan_eksposur=False)
    k15 = hasil["kejadian"]["bmg2026pwtr"]
    assert [b["n_zona"] for b in k15["buletin"]][:2] == [2, 22], "15 Agu 2026: 2 lalu 22 zona"
    assert k15["ukur_maks_m"] == 0.94 and k15["buletin"][1]["perubahan"]["zona_baru"] >= 20 and k15["buletin"][1]["perubahan"]["m_sebelum"] == 7.0
    assert all(b["tidak_terurai"] is None for k in hasil["kejadian"].values() for b in k["buletin"]), "semua judul terurai"
    assert "aman" not in json.dumps(hasil, ensure_ascii=False).lower().replace("amanah", "")
    assert rakit(tsu, kamus, indeks, dengan_eksposur=False)[1] == hasil, "deterministik"
    print("tsunami_zona uji OK:", r)


if __name__ == "__main__":
    {"uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "jalan", jalan)()
