"""Uji alur cuaca ekstrem: cuaca.py main dari ujung ke ujung pada SALINAN SEMENTARA folder data, jaringan diganti fixture/respons buatan.

  python3 scripts/cuaca/uji_alur.py

Masukan nyata repo (hujan.json, hujan_ansambel.json, pusat_kec.json, kejadian.json, peringatan.json, rob.json, meta.json, cuaca_sarana.json) disalin ke folder
sementara dan tanggalnya digeser ke hari ini; semua keluaran ditulis di sana, bukan ke public/banjir/data. Yang diperiksa: tiap berkas ada, skema sesuai kontrak
(kunci, panjang larik, rentang tingkat, indeks kecamatan), ukuran, tak satu pun langkah gagal, laporan lolos laporan.periksa dan yang salah ditolak.
Pesan gagal menyebut angkanya.
"""
import datetime as dt, importlib.util, json, os, shutil, sys, tempfile, urllib.parse, urllib.request

AK = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture")
DATA = os.path.join(AK, "public/banjir/data")
MASUK = ["hujan.json", "hujan_ansambel.json", "pusat_kec.json", "kejadian.json", "peringatan.json", "rob.json", "meta.json", "cuaca_sarana.json"]
BATAS = {"cuaca_kec.json": 400, "cuaca_medan.json": 600, "cuaca_laporan.json": 400, "cuaca_gelombang.json": 400, "cuaca_verifikasi.json": 800}


def geser(tmp, hari_ini):
    """Salin masukan; geser tanggal hujan.json dan ansambel supaya 'hari ini' = hari ini sungguhan."""
    for f in MASUK:
        shutil.copy(os.path.join(DATA, f), os.path.join(tmp, f))
    h = json.load(open(os.path.join(tmp, "hujan.json")))
    h["hari"] = [(hari_ini + dt.timedelta(days=i - 3)).isoformat() for i in range(len(h["hari"]))]
    h["hari_ini"] = hari_ini.isoformat()
    json.dump(h, open(os.path.join(tmp, "hujan.json"), "w"))
    a = json.load(open(os.path.join(tmp, "hujan_ansambel.json")))
    a["hari"] = [(hari_ini + dt.timedelta(days=i)).isoformat() for i in range(len(a["hari"]))]
    json.dump(a, open(os.path.join(tmp, "hujan_ansambel.json"), "w"))


def jam_utc(hari_ini, n):
    t0 = dt.datetime(hari_ini.year, hari_ini.month, hari_ini.day)
    return [(t0 + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(n)]


def ambil_palsu(hari_ini):
    """Respons buatan berbentuk respons nyata Open-Meteo (daftar bila banyak lokasi)."""
    def f(url, *a, **k):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        lat = q["latitude"][0].split(",")
        if "marine-api" in url:
            n = 72
            return [{"hourly": {"time": jam_utc(hari_ini, n), "wave_height": [4.2 if i == 0 else None if i == 1 else 1.0] * n,
                                "wave_direction": [200.0] * n}} for i in range(len(lat))]
        if "previous-runs-api" in url:
            d0, d1 = dt.date.fromisoformat(q["start_date"][0]), dt.date.fromisoformat(q["end_date"][0])
            t = [(dt.datetime.combine(d0, dt.time()) + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(((d1 - d0).days + 1) * 24)]
            return [{"hourly": {"time": t, **{k: [3.0 if i == 0 else 0.0] * len(t) for k in
                                              ("precipitation", "precipitation_previous_day1", "precipitation_previous_day2", "precipitation_previous_day3")}}} for i in range(len(lat))]
        assert "api.open-meteo.com/v1/forecast" in url, url
        n = 72
        return [{"hourly": {"time": jam_utc(hari_ini, n), "wind_speed_10m": [6.0] * n, "wind_direction_10m": [270.0] * n,
                            "precipitation": [0.5 if i % 2 else 0.0 for i in range(n)], "wind_gusts_10m": [12.0] * n}} for _ in lat]
    return f


def unduh_siklon_palsu(url):
    if url.endswith("jtwc.rss"):
        return open(os.path.join(FIX, "jtwc.rss")).read()
    if url.endswith("wp2926web.txt"):
        return open(os.path.join(FIX, "jtwc_wp2926web.txt")).read()
    if url.endswith("web.txt"):
        return "TIDAK ADA PERINGATAN"
    if "geteventlist" in url:
        return open(os.path.join(FIX, "gdacs_daftar.json")).read()
    if "getgeometry" in url:
        return open(os.path.join(FIX, "gdacs_geometry_champi.json")).read()
    raise AssertionError("unduhan tak terduga: " + url)


def jalankan():
    hari_ini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
    with tempfile.TemporaryDirectory() as tmp:
        geser(tmp, hari_ini)

        def tanpa_jaringan(*a, **k):
            raise AssertionError("jaringan nyata dipanggil: " + str(a[0])[:100])
        urllib.request.urlopen = tanpa_jaringan
        import cuaca, dasar, dampak_cuaca, gelombang, laporan_cuaca, medan, prakiraan_kec, sarana, siklon, verifikasi
        for m in (dasar, cuaca, dampak_cuaca, gelombang, laporan_cuaca, medan, prakiraan_kec, sarana, siklon, verifikasi):
            for nama in ("KELUAR", "MASUKAN", "BANJIR"):
                if hasattr(m, nama):
                    setattr(m, nama, tmp)
        fake = ambil_palsu(hari_ini)
        for m in (gelombang, medan, verifikasi):
            m.ambil = fake
        siklon.unduh = unduh_siklon_palsu
        sarana.unduh = tanpa_jaringan
        peringatan = json.load(open(os.path.join(tmp, "peringatan.json")))
        verifikasi.peringatan_terbaru = lambda: (peringatan, None)
        gagal = cuaca.main()
        assert gagal == [], f"langkah gagal: {gagal}"
        verifikasi.main(isi=5)      # jalur isi ulang uji balik (Previous Runs palsu)
        periksa(tmp, hari_ini, laporan_cuaca)


def periksa(tmp, hari_ini, laporan_cuaca):
    B = lambda f: json.load(open(os.path.join(tmp, f)))
    for f in ("kec", "medan", "gelombang", "siklon", "sarana", "dampak", "verifikasi", "arsip_bmkg", "laporan", "meta", "prakiraan", "riwayat"):
        j = os.path.join(tmp, f"cuaca_{f}.json")
        assert os.path.exists(j), f"cuaca_{f}.json tidak dibuat"
        kb = os.path.getsize(j) / 1024
        assert kb <= BATAS.get(f"cuaca_{f}.json", 2000), f"cuaca_{f}.json {kb:.0f} KB melebihi batas {BATAS.get(f'cuaca_{f}.json')} KB"
    hari = [(hari_ini + dt.timedelta(days=i)).isoformat() for i in range(3)]
    pusat = B("pusat_kec.json")
    k = B("cuaca_kec.json")
    assert k["hari"] == hari and k["kolom"] == ["i", "t", "p50", "p100", "mm", "g", "hs"] and k["kunci"] == "pusat_kec", (k["hari"], hari)
    for key in ("hujan_mm", "angin_kmj", "hs_m", "p_siaga", "p_awas"):
        assert key in k["ambang"], f"ambang tanpa {key}"
    assert k["kec"], "tidak satu kecamatan pun t >= 1: data uji terlalu tenang"
    for r in k["kec"]:
        assert len(r) == 7 and 0 <= r[0] < len(pusat), f"baris kec {r[:2]} indeks di luar {len(pusat)} kecamatan"
        assert len(r[1]) == 3 and max(r[1]) >= 1 and all(0 <= t <= 3 for t in r[1]), f"t salah {r[1]}"
        assert all(len(r[j]) == 3 for j in (2, 3, 4, 5)) and (r[6] is None or len(r[6]) == 3), f"panjang larik kec {r[0]}"
    for kp, v in k["prov"].items():
        assert len(v["t"]) == 3 and len(v["n"]) == 3 and all(len(x) == 3 for x in v["n"]), f"prov {kp} {v}"
    md = B("cuaca_medan.json")
    assert md["n"] == 72 and len(md["u"]) == 72 and md["nx"] * md["ny"] == len(md["u"][0]), (md["n"], len(md["u"]), md["nx"] * md["ny"], len(md["u"][0]))
    assert all(len(md[a]) == 72 and len(md[a][0]) == len(md["u"][0]) for a in "uvrg") and isinstance(md["u"][5][5], int), "medan u/v/r/g tak sepanjang"
    g = B("cuaca_gelombang.json")
    assert g["n"] == 72 and g["titik"], "gelombang kosong"
    for r in g["titik"]:
        assert len(r) == 7 and len(r[4]) == 72 and r[6] == max(x for x in r[4] if x is not None), f"titik gelombang {r[:4]}"
    assert any(r[6] == 42 for r in g["titik"]), "Hs 4,2 m buatan tidak sampai ke keluaran"
    s = B("cuaca_siklon.json")
    assert isinstance(s["aktif"], list) and isinstance(s["gagal"], list) and s["gagal"] == [], s["gagal"]
    assert [x["nama"] for x in s["aktif"]] == ["Champi"], [x["nama"] for x in s["aktif"]]
    for x in s["aktif"]:
        assert all(len(p) == 5 and p[4] in ("amatan", "prakiraan") for p in x["lintasan"]), "lintasan salah bentuk"
    d = B("cuaca_dampak.json")
    assert d["hari"] == hari and all(len(d["zona"][a]) == 3 for a in ("jiwa", "sekolah", "faskes", "kec")) and len(d["pesisir"]["jiwa"]) == 3, d.get("zona")
    sar = B("cuaca_sarana.json")
    for r in d["pelabuhan"]:
        assert len(r) == 4 and r[0] < len(sar["pelabuhan"]) and len(r[1]) == 3, f"dampak pelabuhan {r}"
    for r in d["bandara"]:
        assert len(r) == 4 and r[0] < len(sar["bandara"]) and len(r[1]) == 3, f"dampak bandara {r}"
    assert "terpapar" in d or "tahunan" in d or d["zona"], "kunci lama dampak hilang"
    m = B("cuaca_meta.json")
    assert m["besok"]["hari"] == hari[1] and m["besok"]["n_kec"] == sum(m["besok"]["prov"].values()) and isinstance(m["siklon"], list) and m["siklon"][0]["nama"] == "Champi", m.get("besok")
    v = B("cuaca_verifikasi.json")
    assert len(v["kita"]["seri"]) == 5 and v["kita"]["n_hari"] == 0 and set(v["kita"]["lead"]) == {"1", "2", "3"} and "nasional" in v["bmkg"], (len(v["kita"]["seri"]), v["kita"].get("n_hari"))   # 5 hari terisi tetapi semuanya sesudah DIBI terakhir: belum dinilai
    assert v["kita"]["n_min"] == 30 and v["bmkg"]["n_min"] == 30 and all(set(x) == {"1", "2", "3"} for x in v["kita"]["prov"].values()), "n_min atau prov per lead hilang"
    assert B("cuaca_arsip_bmkg.json")["kolom"][0] == "id"
    sk = B("cuaca_seri_kec.json")
    assert hari[0] in sk["tgl"] and sk["tgl"][hari[0]]["n"] == sum(v["n"][0][1] + v["n"][0][2] for v in k["prov"].values()), (sk["tgl"].get(hari[0]), "jumlah Siaga+Awas hari ini di cuaca_kec")
    lap = B("cuaca_laporan.json")
    assert lap["nasional"]["kec"][-1] == sk["tgl"][hari[0]]["n"] and lap["nasional"]["kec"][0] is None, lap["nasional"]["kec"][-3:]
    um = importlib.util.spec_from_file_location("umum_laporan_alur", os.path.join(AK, "scripts/umum/laporan.py"))
    L = importlib.util.module_from_spec(um)
    um.loader.exec_module(L)
    assert L.periksa(lap) == [] and len(lap["hari"]) >= 7, (L.periksa(lap), len(lap["hari"]))
    assert laporan_cuaca.periksa_cutoff(lap) == [], lap["cutoff"]
    assert laporan_cuaca.periksa_cutoff({**lap, "cutoff": "2999-01-01T00:00+07:00"}), "cutoff sesudah hari terakhir harus ditolak"
    salah = json.loads(json.dumps(lap))
    k0 = salah["metrik"][0]["k"]
    salah["nasional"][k0] = salah["nasional"][k0][:-1]
    assert any("panjang" in e for e in L.periksa(salah)), "laporan dengan array nasional kurang satu harus ditolak"
    salah = json.loads(json.dumps(lap))
    salah["metrik"][0]["utama"] = False
    assert L.periksa(salah), "laporan tanpa metrik utama harus ditolak"
    print(f"ok alur: {len(k['kec'])} kec t>=1, {len(g['titik'])} titik gelombang, {len(s['aktif'])} siklon, laporan {len(lap['hari'])} hari, "
          f"medan {os.path.getsize(os.path.join(tmp, 'cuaca_medan.json')) // 1024} KB")


if __name__ == "__main__":
    jalankan()
