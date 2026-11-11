"""Kaji cepat gempa (SK-054; ALGORITMA F3.1 dan F3.2). Fungsi murni; jaringan hanya di adapter_g2.py dan pengiriman ingest oleh job.

Masukan: satu entri keluaran adapter_g2 (`id, mag, waktu, status, cont_mmi` + `lat, lon, dalam` bila ada), `pusat` {kunci_kec: [lat, lon]}, `pend` {kunci_kec: jiwa} (WorldPop).
MMI per kecamatan: (a) kontur ShakeMap `cont_mmi.json` bila terbit, (b) `guncangan.mmi_kecamatan` bila belum (status `menunggu_data`, korban `null`, perkiraan hanya di `sementara`).
Korban jiwa: PAGER (theta 13,248768, beta 0,150846; pita 4 dari scripts/gempa/pager.py) dan ITB (10^(0,62275231 k - 8,03314466), k >= 4, tanpa pita) BERDAMPINGAN (U13).
Rentang = [min(K_P/4, K_I), maks(K_P x 4, K_I)], selalu estimasi-model. Kelas siaga dari K_P. Galat kalibrasi (3,0586; faktor_loo 5,341) adalah galat model kerapuhan sendiri terhadap 8 gempa (in-sample, pengamatan dari ingatan), BUKAN galat PAGER atau ITB; ditulis, TIDAK melebarkan rentang. Rumah rusak: menunggu, bukan 0.
Tidak dihitung: tsunami dan likuefaksi. ponytail: titik pusat kecamatan di dalam cincin kontur TERTUTUP, MMI = nilai kontur tertinggi yang melingkupinya; kontur yang terpotong tepi grid diabaikan (naikkan ke interpolasi grid bila cakupan kurang).
Pakai: python3 -I scripts/siklus/kaji_gempa.py uji
"""
import datetime as dt, glob, importlib.util, json, math, os, re, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
YAKIN = "estimasi-model"
ITB_A, ITB_B = 0.62275231, -8.03314466
MMI_HITUNG = 3.5


def _muat(jalur, nama):
    s = importlib.util.spec_from_file_location(nama, jalur)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


PG = _muat(os.path.join(AKAR, "scripts/gempa/pager.py"), "sk_pager")
GC = PG._g()
KAL = os.path.join(AKAR, "public/gempa/data/kalibrasi_kerusakan.json")


def itb_jiwa(per):
    """per = {MMI: penduduk} -> jiwa model ITB; k = min(10, int(MMI)), dihitung bila k >= 4."""
    return sum(p * 10 ** (ITB_A * min(10, int(k)) + ITB_B) for k, p in per.items() if min(10, int(k)) >= 4 and p > 0)


def korban(per):
    p, ki = PG.jiwa(per), itb_jiwa(per)
    r1 = lambda x: round(x, 1)
    return {"rentang": [r1(min(p["bawah"], ki)), r1(max(p["atas"], ki))], "kelas": p["kelas"],
            "model": {"pager": [r1(p["bawah"]), r1(p["atas"])], "itb": [r1(ki), r1(ki)]}, "jiwa_pager": r1(p["jiwa"]), "jiwa_itb": r1(ki),
            "per_mmi": {str(k): per[k] for k in sorted(per)}, "y": YAKIN}


def galat_kalibrasi(jalur=KAL):
    d = json.load(open(jalur, encoding="utf-8"))
    c = _muat(os.path.join(AB, "ujibalik.py"), "sk_ujibalik").dari_kalibrasi(jalur)["cakupan"]
    return {"kalibrasi": d["kalib"], "faktor_loo": d["faktor_loo"], "n_gempa": d["n"], "pita": PG.PITA, "melebihi_pita": d["faktor_loo"] > PG.PITA, "cakupan": c, "in_sample": True,
            "catatan": "galat model kerapuhan sendiri, bukan PAGER atau ITB; PAGER dan ITB belum diuji balik; model dapat meleset sampai %s kali; rentang tidak dilebarkan" % str(d["faktor_loo"]).replace(".", ",")}


def _dalam(titik, cincin):
    lat, lon = titik
    d = False
    for (x1, y1), (x2, y2) in zip(cincin, cincin[1:]):
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            d = not d
    return d


def mmi_kontur(cont, pusat):
    """FeatureCollection kontur MMI -> {kunci_kec: mmi} untuk kecamatan di dalam cincin tertutup. Di luar semua cincin = tidak ada nilai (bukan 0)."""
    cincin = []
    for f in cont["features"]:
        g, v = f.get("geometry") or {}, f["properties"]["value"]
        garis = g.get("coordinates") or []
        for c in ([garis] if g.get("type") == "LineString" else garis if g.get("type") == "MultiLineString" else []):
            if len(c) >= 4 and c[0] == c[-1]:
                cincin.append((v, c))
    out = {}
    for k, (la, lo) in pusat.items():
        ada = [v for v, c in cincin if _dalam((la, lo), c)]
        if ada:
            out[k] = max(ada)
    return out


def _waktu(ms):
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ") if isinstance(ms, (int, float)) else None


def _mmi_sementara(g, pusat):
    if not all(isinstance(g.get(k), (int, float)) for k in ("lat", "lon", "mag", "dalam")):
        return None
    h = GC.mmi_kecamatan({"lat": g["lat"], "lon": g["lon"], "m": g["mag"], "dalam": max(g["dalam"], 1.0)}, pusat)
    return {k: v["mmi"] for k, v in h.items()}


def hitung(g, pusat, pend, kal=None):
    """g = entri adapter_g2 -> {"ringkas", "masukan", "hasil", "status", "galat_kalibrasi"} siap ingest/kaji. Gagal ambil = menunggu_data, korban null."""
    kal = kal or galat_kalibrasi()
    masuk = {"sumber": "usgs-shakemap", "id": str(g["id"]), "produk": "cont_mmi.json", "waktu_data": _waktu(g.get("waktu"))}
    dasar = {"v": 1, "model": "gempa", "yakin": YAKIN, "masukan": masuk, "galat_kalibrasi": kal, "mag": g.get("mag"),
             "rumah_rusak": {"n": None, "status": "menunggu", "alasan": "kurva kerapuhan resmi tidak ditemukan"},
             "tidak_dihitung": "tsunami dan likuefaksi (Palu 2018: PAGER 86 lawan nyata 4.140)"}
    if g.get("status") == "ok" and g.get("cont_mmi"):
        mmi = mmi_kontur(g["cont_mmi"], pusat)
        per = PG.per_mmi(mmi, pend)
        k = korban(per)
        ge6 = sum(pend.get(x) or 0 for x, v in mmi.items() if v >= 6)
        tanpa = sum(1 for x in pusat if x not in mmi)
        hasil = {**dasar, "status": "dihitung", "korban": k, "jumlah_kec_tanpa_mmi": tanpa, "jiwa_terpapar": {"mmi_ge_6": {"worldpop": ge6, "dukcapil": None, "ghsl": None}}}
        ring = {"rentang": k["rentang"], "kelas": k["kelas"], "model": k["model"], "jumlah_kec_tanpa_mmi": tanpa}
        return {"status": "dihitung", "ringkas": ring, "masukan": masuk, "galat_kalibrasi": kal, "hasil": hasil}
    mmi = _mmi_sementara(g, pusat)
    sem = None
    if mmi is not None:
        k = korban(PG.per_mmi(mmi, pend))
        sem = {"sumber": "model guncangan sendiri (BSSA14, Zhao 2006, Worden 2012; Vs30 400 m/s, nilai tengah)", "rentang": k["rentang"], "model": k["model"], "kelas": k["kelas"], "y": YAKIN}
    alasan = "USGS belum menerbitkan ShakeMap" if g.get("status") == "tanpa_shakemap" else "grid ShakeMap gagal diambil"
    hasil = {**dasar, "status": "menunggu_data", "korban": None, "alasan": alasan, "sementara": sem, "jiwa_terpapar": None}
    return {"status": "menunggu_data", "ringkas": {"rentang": None, "alasan": alasan}, "masukan": masuk, "galat_kalibrasi": kal, "hasil": hasil}


def muatan_ingest(kj, r):
    """badan POST /api/siklus/ingest/kaji (DT 5.2.6, siklus_kaji.js ingestKaji)."""
    return {"kejadian_id": kj, "model": "gempa", "status": r["status"], "yakin": YAKIN, "masukan": r["masukan"], "ringkas": r["ringkas"],
            "galat_kalibrasi": {k: v for k, v in r["galat_kalibrasi"].items() if k != "catatan"}, "hasil_r2": f"siklus/saji/kaji/{kj}.json"}

# ---------------------------------------------------------------- pengiriman (SK-056): dry-run bawaan, kirim hanya dengan --kirim
RE_KJ = re.compile(r"^KJ-\d{4}-[0-9A-HJKMNP-TV-Z]{8}$")


def periksa(b):
    """Cermin ringkas ingestKaji (siklus_kaji.js): -> daftar masalah; kosong = sah. Rentang wajib [bawah, atas] untuk status dihitung."""
    m = []
    if not RE_KJ.match(str(b.get("kejadian_id"))):
        m.append("kejadian_id bukan KJ-")
    if b.get("model") not in ("gempa", "banjir_jam1"):
        m.append("model tidak sah")
    if b.get("status") != "dihitung":
        m.append("hanya status dihitung yang dikirim")
    r = (b.get("ringkas") or {}).get("rentang")
    if not (isinstance(r, list) and len(r) == 2 and all(isinstance(x, (int, float)) and not isinstance(x, bool) and 0 <= x <= 1e9 for x in r) and r[0] <= r[1]):
        m.append("ringkas.rentang bukan [bawah, atas]")
    if b.get("yakin") != YAKIN:
        m.append("yakin harus estimasi-model")
    for k, mk in (("ringkas", 1500), ("masukan", 800), ("galat_kalibrasi", 400)):
        if len(json.dumps(b.get(k), ensure_ascii=False)) > mk:
            m.append(f"{k} melebihi {mk} karakter")
    h = b.get("hasil_r2")
    if h is not None and h != f"siklus/saji/kaji/{b.get('kejadian_id')}.json":
        m.append("hasil_r2 salah")
    return m


def peta_kj(baris, sumber, kode):
    """baris ingest/sumber -> KJ- untuk (sumber, kode) yang status terpasang; tepat satu, selain itu None."""
    kj = {r["kejadian_id"] for r in baris if r.get("sumber") in sumber and r.get("kode") == kode and r.get("status") == "terpasang" and r.get("kejadian_id")}
    return kj.pop() if len(kj) == 1 else None


def tarik_sumber(http, basis, dari, sampai):
    """Baris sk_kejadian_sumber (jalur ingest/sumber, Bearer) lewat _tarik milik pasang.py."""
    P = _muat(os.path.join(AB, "pasang.py"), "sk_pasang")
    return P._tarik(http, basis, "sumber", dari, sampai)


def kirim(muatan, basis, http=None, sungguhan=False):
    """-> [(kejadian_id, hasil)]. Tanpa `sungguhan`, http tidak pernah dipanggil (dry-run). Muatan tak lolos periksa tidak dikirim."""
    out = []
    for b in muatan:
        m = periksa(b)
        if m:
            out.append((b.get("kejadian_id"), "DITOLAK lokal: " + "; ".join(m)))
        elif not sungguhan:
            out.append((b["kejadian_id"], "dry-run: rentang %s" % b["ringkas"]["rentang"]))
        else:
            out.append((b["kejadian_id"], http("POST", basis.rstrip("/") + "/api/siklus/ingest/kaji", b)))
    return out


def rencana(daftar, baris, pusat, pend, keluar=None):
    """daftar entri adapter_g2 -> (muatan, lewati[(id, alasan)]). Tanpa KJ atau menunggu_data tidak dikirim.
    Sumber di sk_kejadian_sumber bernama `usgs` (kode = id USGS, sama dengan pasang.py hidup); tidak ada nama lain yang ditebak.
    keluar: akar saji; bila ada, siklus/saji/kaji/<KJ>.json ditulis (lewat saji.periksa_berkas) sebelum muatan dikirim."""
    kal, muatan, lewati = galat_kalibrasi(), [], []
    for g in daftar:
        kj = peta_kj(baris, ("usgs",), str(g["id"]))
        if not kj:
            lewati.append((g["id"], "belum punya KJ- di sk_kejadian_sumber"))
            continue
        r = hitung(g, pusat, pend, kal)
        if r["status"] != "dihitung":
            lewati.append((g["id"], "menunggu_data: " + r["ringkas"]["alasan"]))
            continue
        if keluar:
            m = _muat(os.path.join(AB, "kaji_banjir.py"), "sk_kaji_banjir").tulis(keluar, kj, {"model": "gempa", **r["hasil"]})
            if m:
                lewati.append((g["id"], "saji kaji ditolak: " + "; ".join(m)))
                continue
        muatan.append(muatan_ingest(kj, r))
    return muatan, lewati


def _terakhir(mentah):
    f = sorted(glob.glob(os.path.join(mentah, "usgs-shakemap", "*", "*.json")))
    return f[-1] if f else None


def _opsi(a, nama, bawaan=None):
    return a[a.index(nama) + 1] if nama in a else bawaan


def _kirim_cli(a):
    f = _opsi(a, "--berkas") or _terakhir(_opsi(a, "--mentah", os.path.join(AKAR, "data/raw/siklus/mentah")))
    if not f:
        sys.exit("tidak ada ShakeMap mentah (--berkas atau --mentah DIR)")
    daftar = json.load(open(f, encoding="utf-8"))["gempa"]
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    pend = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
    basis, sungguhan = _opsi(a, "--basis", "https://centurisk97.id").rstrip("/"), "--kirim" in a
    http, baris = None, []
    if sungguhan or "--basis" in a:
        tk = os.environ.get("PIPA_TOKEN")
        if not tk:
            sys.exit("butuh env PIPA_TOKEN")
        http = _muat(os.path.join(AB, "pasang.py"), "sk_pasang")._http(tk)
        h = dt.date.today()
        baris = tarik_sumber(http, basis, (h - dt.timedelta(days=30)).isoformat(), h.isoformat())
    muatan, lewati = rencana(daftar, baris, pusat, pend, _opsi(a, "--keluar"))
    for i, why in lewati:
        print("LEWATI", i, why)
    for kj, hs in kirim(muatan, basis, http, sungguhan):
        print("KIRIM" if sungguhan else "KERING", kj, hs)
    print("berkas:", f, "| terkirim" if sungguhan else "| dry-run (tambah --kirim untuk mengirim)")


def _uji():
    # UJ-F3-02: kasus ALGORITMA F3.2
    per = {6: 1_000_000, 7: 500_000, 8: 200_000}
    p = PG.jiwa(per)
    assert abs(p["jiwa"] - 88.44) < 0.05 and p["kelas"] == "kuning"
    assert abs(itb_jiwa(per) - 334.2) < 0.1, itb_jiwa(per)
    k = korban(per)
    assert k["rentang"] == [22.1, 353.8] and k["kelas"] == "kuning" and k["y"] == YAKIN
    assert k["model"]["pager"] == [22.1, 353.8] and k["model"]["itb"] == [334.2, 334.2], "dua model berdampingan, tidak digabung"
    assert PG.per_mmi({"a": 7.5, "b": 3.4}, {"a": 10, "b": 10}) == {8: 10}, "MMI 7,5 jadi 8; 3,4 tidak dihitung"
    assert korban({3: 1e9, 2: 5})["rentang"] == [0.0, 0.0], "k < 4 tidak dihitung"
    assert "total" not in json.dumps(k) and "rata" not in json.dumps(k)
    # galat kalibrasi dibaca dari berkas, tertulis, tidak melebarkan rentang
    gk = galat_kalibrasi()
    assert gk["kalibrasi"] == 3.0586 and gk["faktor_loo"] == 5.341 and gk["melebihi_pita"] is True and gk["pita"] == 4 and gk["in_sample"] is True and gk["cakupan"] == [4, 8] and "belum diuji balik" in gk["catatan"]
    # kontur: dua cincin bersarang + satu garis terbuka (diabaikan); titik di luar tak punya nilai
    def cin(v, a, b):
        return {"properties": {"value": v}, "geometry": {"type": "LineString", "coordinates": [[a, a], [b, a], [b, b], [a, b], [a, a]]}}
    cont = {"type": "FeatureCollection", "features": [cin(5, 0, 10), cin(7, 3, 7),
            {"properties": {"value": 9}, "geometry": {"type": "LineString", "coordinates": [[0, 0], [9, 9], [9, 0]]}}]}
    pusat = {"tengah": [5, 5], "tepi": [1, 1], "luar": [20, 20]}
    assert mmi_kontur(cont, pusat) == {"tengah": 7, "tepi": 5}, mmi_kontur(cont, pusat)
    # hitung: grid ada
    pend = {"tengah": 1_000_000, "tepi": 500_000, "luar": 999}
    g = {"id": "us1", "mag": 7.8, "waktu": 1_762_732_800_000, "status": "ok", "cont_mmi": cont}
    r = hitung(g, pusat, pend)
    assert r["status"] == "dihitung" and len(r["ringkas"]["rentang"]) == 2 and r["ringkas"]["rentang"][0] <= r["ringkas"]["rentang"][1]
    assert r["hasil"]["rumah_rusak"] == {"n": None, "status": "menunggu", "alasan": "kurva kerapuhan resmi tidak ditemukan"}, "rumah rusak menunggu, bukan 0"
    assert r["hasil"]["jumlah_kec_tanpa_mmi"] == 1 == r["ringkas"]["jumlah_kec_tanpa_mmi"], "kecamatan luar kontur dihitung, bukan dibuang diam-diam"
    assert r["hasil"]["jiwa_terpapar"]["mmi_ge_6"] == {"worldpop": 1_000_000, "dukcapil": None, "ghsl": None}
    assert r["hasil"]["galat_kalibrasi"]["faktor_loo"] == 5.341 and r["masukan"]["waktu_data"] == "2025-11-10T00:00Z"
    b = muatan_ingest("KJ-2026-9A2WGN3G", r)
    assert b["status"] == "dihitung" and b["yakin"] == YAKIN and b["hasil_r2"] == "siklus/saji/kaji/KJ-2026-9A2WGN3G.json" and len(json.dumps(b["ringkas"])) < 1500 and len(json.dumps(b["masukan"])) < 800
    assert len(json.dumps(b["galat_kalibrasi"])) < 400
    # UJ-F3-03: gagal ambil grid = menunggu_data, korban null, rentang null (bukan 0); GMPE hanya di `sementara`
    for st, ada in (("menunggu_data", "gagal"), ("tanpa_shakemap", "belum")):
        m = hitung({"id": "us2", "mag": 6.0, "waktu": 1, "status": st, "cont_mmi": None}, pusat, pend)
        assert m["status"] == "menunggu_data" and m["hasil"]["korban"] is None and m["ringkas"]["rentang"] is None and m["hasil"]["sementara"] is None
        assert ada in m["ringkas"]["alasan"] or st == "tanpa_shakemap"
    pus2 = {"x": [-7.9, 110.4], "y": [-7.5, 110.5]}
    m = hitung({"id": "us3", "mag": 6.3, "waktu": 1, "status": "menunggu_data", "cont_mmi": None, "lat": -7.96, "lon": 110.45, "dalam": 10}, pus2, {"x": 2_000_000, "y": 1_000_000})
    assert m["status"] == "menunggu_data" and m["hasil"]["korban"] is None and m["ringkas"]["rentang"] is None, "ingest menunggu_data tidak boleh membawa rentang"
    s = m["hasil"]["sementara"]
    assert s["y"] == YAKIN and len(s["rentang"]) == 2 and s["rentang"][1] > 0 and s["model"]["itb"][0] > 0
    assert hitung({"id": "us4", "status": "ok", "cont_mmi": None, "mag": 5, "waktu": None}, pusat, pend)["hasil"]["korban"] is None, "ok tanpa kontur = menunggu"
    # SK-056: pengiriman
    assert periksa(b) == [] and periksa({**b, "kejadian_id": "KJ-x"}) and periksa({**b, "status": "menunggu_data"}) and periksa({**b, "yakin": "resmi"})
    assert periksa({**b, "ringkas": {"rentang": [5, 1]}}) and periksa({**b, "ringkas": {"rentang": None}}) and periksa({**b, "hasil_r2": "x.json"})
    baris = [{"sumber": "usgs", "kode": "us1", "status": "terpasang", "kejadian_id": "KJ-2026-9A2WGN3G"},
             {"sumber": "usgs", "kode": "us9", "status": "ambigu", "kejadian_id": None}]
    daf = [g, {"id": "us9", "mag": 6, "waktu": 1, "status": "ok", "cont_mmi": cont}, {"id": "us1m", "status": "menunggu_data", "cont_mmi": None, "mag": 6, "waktu": 1}]
    mu, lw = rencana(daf, baris, pusat, pend)
    assert [x["kejadian_id"] for x in mu] == ["KJ-2026-9A2WGN3G"] and len(lw) == 2, lw
    import tempfile
    with tempfile.TemporaryDirectory() as t:   # saji kaji ditulis lewat periksa_berkas; hasil_r2 menunjuk berkas yang ada
        mu2, _ = rencana(daf, baris, pusat, pend, t)
        f = os.path.join(t, "siklus/saji/kaji/KJ-2026-9A2WGN3G.json")
        d = json.load(open(f))
        assert d["jenis"] == "kaji" and d["model"] == "gempa" and d["status"] == "dihitung" and d["yakin"] == YAKIN and mu2 == mu and os.path.exists(f)
    assert peta_kj([{**baris[0], "sumber": "gempa"}], ("usgs",), "us1") is None, "nama sumber bukan usgs tidak ditebak"
    daf2 = [{**g, "id": "us1m"}]
    baris2 = [{"sumber": "usgs", "kode": "us1m", "status": "terpasang", "kejadian_id": "KJ-2026-9A2WGN3H"}]
    daf2[0].update(status="menunggu_data", cont_mmi=None)
    assert rencana(daf2, baris2, pusat, pend)[0] == [], "menunggu_data tidak dikirim"
    pernah = []
    def http(*x):
        pernah.append(x)
        return {"status": 201}
    assert kirim(mu, "https://x", http)[0][1].startswith("dry-run") and pernah == [], "tanpa --kirim http tak dipanggil"
    assert kirim([{**mu[0], "status": "menunggu_data"}], "https://x", http, True)[0][1].startswith("DITOLAK") and pernah == []
    assert kirim(mu, "https://x/", http, True)[0][1] == {"status": 201} and pernah[0][:2] == ("POST", "https://x/api/siklus/ingest/kaji")
    print("kaji_gempa: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        _uji()
    elif sys.argv[1:2] == ["kirim"]:
        _kirim_cli(sys.argv[2:])
    else:
        sys.exit("pakai: kaji_gempa.py uji | kirim [--berkas F | --mentah DIR] [--basis URL] [--keluar AKAR_SAJI] [--kirim]")
