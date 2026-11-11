"""BPS IKK (var 2515) dan IHPB (var 1018) ke bersih/bps/ (SK-073, ALG F4.2).

Kunci hanya dari environment BPS_API_KEY, hanya dibaca saat ambil sungguhan, tidak pernah ditulis ke berkas, log, atau pesan galat.
Kunci wilayah BPS (vervar 4 digit) BUKAN kab4: dipetakan lewat nama dan provinsi ke kunci.kab4 (Kemendagri). Tak terpetakan dihitung, tidak dibuang diam-diam.
IKK hanya dibandingkan dalam tahun sama (kota acuan berganti per tahun). IHPB hanya pada seri berdasar sama (2018=100 sampai Des 2024, 2023=100 sejak Jan 2025);
melintasi patahan dasar atau sel kosong = None ("menunggu"), bukan 0. Harga kosong = None.
Pakai: BPS_API_KEY=... python3 -I scripts/siklus/bps.py ambil [--mentah DIR] [--keluar DIR] | uji
"""
import importlib.util, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
VAR = {"ikk": 2515, "ihpb": 1018}
SUMBER = {"ikk": "bps-ikk", "ihpb": "bps-ihpb"}
DASAR_IHPB = ((2025, 1), "2023"), ((2018, 1), "2018")  # (mulai, dasar) dari yang terbaru; sebelum 2018-01 tidak ada dasar = menunggu


_CACHE = {}


def _muat(nama):
    if nama in _CACHE:
        return _CACHE[nama]
    s = importlib.util.spec_from_file_location("sk_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    _CACHE[nama] = m
    return m


def urai(isi, var):
    """Respons WebAPI BPS (bytes) -> (daftar sel, daftar vervar). Bentuk salah = ValueError. Kunci sel: vervar+var+turvar+tahun+turtahun."""
    d = json.loads(isi)
    if not isinstance(d, dict) or d.get("status") != "OK" or d.get("data-availability") != "available":
        raise ValueError("respons BPS bukan status OK / available")
    for k in ("vervar", "tahun", "turtahun", "turvar", "datacontent"):
        if not isinstance(d.get(k), (list, dict)) or not d[k]:
            raise ValueError(f"respons BPS tanpa {k}")
    if not any(v.get("val") == var for v in d.get("var", [])):
        raise ValueError(f"respons BPS bukan var {var}")
    tv = d["turvar"][0]["val"]
    sel = []
    for v in d["vervar"]:
        for t in d["tahun"]:
            for tt in d["turtahun"]:
                n = d["datacontent"].get(f"{v['val']}{var}{tv}{t['val']}{tt['val']}")
                sel.append({"vervar": v["val"], "label": v["label"], "tahun": int(t["label"]),
                            "periode": tt["val"], "nilai": n if isinstance(n, (int, float)) and not isinstance(n, bool) else None})
    return sel, d["vervar"]


def bersih_ikk(sel):
    """-> ({kab4: {tahun: nilai|None}}, hitung). Wilayah dipetakan lewat nama dan provinsi (2 digit pertama kode BPS)."""
    K = _muat("kunci")
    kab, tak, kosong = {}, set(), 0
    for s in sel:
        k = K.kab4(s["label"], str(s["vervar"])[:2])
        if k is None:
            tak.add(s["vervar"])
            continue
        kab.setdefault(k, {})[str(s["tahun"])] = s["nilai"]
        kosong += s["nilai"] is None
    return kab, {"sel": len(sel), "kab_tak_terpetakan_sel": sum(1 for s in sel if s["vervar"] in tak), "kab_tak_terpetakan": len(tak),
                 "nilai_kosong": kosong}


def bersih_ihpb(sel):
    """-> ({kelompok: {'YYYY-MM': {nilai, dasar}}}, hitung)."""
    out, kosong = {}, 0
    for s in sel:
        ym = (s["tahun"], s["periode"])
        out.setdefault(str(s["vervar"]), {"nama": s["label"], "seri": {}})["seri"][f"{ym[0]}-{ym[1]:02d}"] = {"nilai": s["nilai"], "dasar": dasar_ihpb(*ym)}
        kosong += s["nilai"] is None
    return out, {"sel": len(sel), "nilai_kosong": kosong}


def dasar_ihpb(tahun, bulan):
    return next((d for m, d in DASAR_IHPB if (tahun, bulan) >= m), None)


def rasio_ihpb(kelompok, t0, t1):
    """IHPB_t1 / IHPB_t0 untuk (tahun, bulan); None (menunggu) bila beda dasar, sel kosong, atau tidak ada."""
    sr = kelompok["seri"]
    a, b = sr.get("%d-%02d" % t0), sr.get("%d-%02d" % t1)
    if not a or not b or a["dasar"] is None or a["dasar"] != b["dasar"] or not a["nilai"] or b["nilai"] is None:
        return None
    return b["nilai"] / a["nilai"]


def harga_terindeks(h_ref, ikk_k, ikk_ref, ihpb_t1, ihpb_t0):
    """h = h_ref x (IKK_k / IKK_ref) x (IHPB_t1 / IHPB_t0); komponen kosong atau penyebut nol = None, bukan 0. IKK harus dari tahun sama (pemanggil)."""
    if None in (h_ref, ikk_k, ikk_ref, ihpb_t1, ihpb_t0) or not ikk_ref or not ihpb_t0:
        return None
    return h_ref * (ikk_k / ikk_ref) * (ihpb_t1 / ihpb_t0)


def _ambil(klien, jenis, base=None, kunci=None):
    """Ambil mentah. Kunci disensor dari pesan galat. Tanpa kunci: Gagal tanpa jaringan -> panen mengembalikan 'menunggu'."""
    P = _muat("panen")
    kunci = kunci or os.environ.get("BPS_API_KEY", "")
    if not kunci:
        raise P.Gagal("BPS_API_KEY tidak ada di environment")
    u = (base or _muat("registri").muat()["sumber"][[s["id"] for s in _muat("registri").muat()["sumber"]].index(SUMBER[jenis])]["url"]).rstrip("/")
    try:
        return klien.ambil(f"{u}/key/{kunci}"), "json"
    except P.Gagal as e:
        raise P.Gagal(str(e).replace(kunci, "***"))


def jalankan(jenis_daftar, klien, mentah, keluar, base=None, kunci=None, tanggal=None):
    P, G = _muat("panen"), _muat("gudang")
    laporan, hasil = {}, {}
    for j in jenis_daftar:
        r = P.panen(SUMBER[j], lambda: _ambil(klien, j, base, kunci), mentah, tanggal=tanggal)
        if r["status"] != "ok":
            hasil[j] = {"status": "menunggu", "alasan": r["alasan"]}
            continue
        sel, _ = urai(open(r["berkas"], "rb").read(), VAR[j])
        isi, h = (bersih_ikk if j == "ikk" else bersih_ihpb)(sel)
        hasil[j] = {"status": "ok", **h}
        laporan[j] = h
        os.makedirs(os.path.join(keluar, "siklus/bersih/bps"), exist_ok=True)
        sm = _muat("registri").muat()["sumber"]
        s = next(x for x in sm if x["id"] == SUMBER[j])
        json.dump(G.selubung("bps_" + j, {"yakin": "resmi", "atribusi": s["atribusi"], "var": VAR[j],
                                          "catatan": "kab4 = Kemendagri lewat nama dan provinsi; kode BPS tidak dipakai sebagai kab4" if j == "ikk" else
                                          "seri berdasar beda tidak dibandingkan (menunggu)", "data": isi}),
                  open(os.path.join(keluar, f"siklus/bersih/bps/{j}.json"), "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True)
    if laporan:
        masuk = sum(h["sel"] for h in laporan.values())
        buang = sum(h.get("kab_tak_terpetakan_sel", 0) for h in laporan.values())
        json.dump({"masuk": masuk, "tersisa": masuk - buang, "dibuang": {"kab_tak_terpetakan": buang}, "dibuang_total": buang, "nilai_kosong": sum(h["nilai_kosong"] for h in laporan.values())},
                  open(os.path.join(keluar, "siklus/bersih/bps/laporan.json"), "w"), sort_keys=True)
    return hasil


def _uji():
    import http.server, threading
    P = _muat("panen")
    # urai: bentuk salah ditolak
    for salah in (b"bukan json", b'{"status":"ERR"}', b'{"status":"OK","data-availability":"available"}',
                  json.dumps({"status": "OK", "data-availability": "available", "var": [{"val": 1}], "turvar": [{"val": "0"}], "vervar": [{"val": 1, "label": "x"}],
                              "tahun": [{"val": 125, "label": "2025"}], "turtahun": [{"val": 0}], "datacontent": {"a": 1}}).encode()):
        try:
            urai(salah, 2515)
            raise AssertionError("harus ditolak")
        except ValueError:
            pass
    ikk = {"status": "OK", "data-availability": "available", "var": [{"val": 2515}], "turvar": [{"val": "0"}], "turtahun": [{"val": 0}],
           "vervar": [{"val": 3301, "label": "Cilacap"}, {"val": 3302, "label": "Banyumas"}, {"val": 3999, "label": "Atlantis"}, {"val": 9471, "label": "Kota Jayapura"}],
           "tahun": [{"val": 124, "label": "2024"}, {"val": 125, "label": "2025"}],
           "datacontent": {"3301251501240": 99.5, "3301251501250": 101.2, "3302251501250": 98.0, "9471251501250": 104.0}}
    sel, _ = urai(json.dumps(ikk).encode(), 2515)
    kab, h = bersih_ikk(sel)
    assert kab["3301"] == {"2024": 99.5, "2025": 101.2} and kab["3302"] == {"2024": None, "2025": 98.0}, kab
    assert h["kab_tak_terpetakan"] == 1 and h["nilai_kosong"] == 2 and "3999" not in kab, h
    assert kab["9171"] == {"2024": None, "2025": 104.0} and "9471" not in kab, "kode BPS 9471 jadi Kemendagri 9171 lewat nama dan provinsi"
    assert all(len(k) == 4 for k in kab) and "3301" in kab and 3301 not in kab, "kab4 Kemendagri, bukan kode BPS mentah"
    ih = {"status": "OK", "data-availability": "available", "var": [{"val": 1018}], "turvar": [{"val": "0"}],
          "vervar": [{"val": 1, "label": "Bangunan"}], "tahun": [{"val": 124, "label": "2024"}, {"val": 125, "label": "2025"}],
          "turtahun": [{"val": 11}, {"val": 12}, {"val": 1}],
          "datacontent": {"1101801241" + "1": 100.0, "1101801241" + "2": 110.0, "1101801251" + "1": 120.0, "1101801251" + "12": 130.0}}
    sel2, _ = urai(json.dumps(ih).encode(), 1018)
    kel, h2 = bersih_ihpb(sel2)
    g = kel["1"]
    assert g["seri"]["2024-11"]["dasar"] == "2018" and g["seri"]["2025-01"]["dasar"] == "2023"
    assert rasio_ihpb(g, (2024, 11), (2024, 12)) == 1.1, "dasar sama"
    assert dasar_ihpb(2017, 12) is None and dasar_ihpb(2018, 1) == "2018" and rasio_ihpb(g, (2017, 12), (2017, 11)) is None, "sebelum 2018 tanpa dasar = menunggu"
    assert rasio_ihpb(g, (2024, 12), (2025, 1)) is None, "melintasi patahan dasar = menunggu"
    assert rasio_ihpb(g, (2024, 11), (2024, 10)) is None, "sel tidak ada = menunggu, bukan 0"
    assert abs(harga_terindeks(100, 120, 100, 110, 100) - 132) < 1e-9
    assert harga_terindeks(100, None, 100, 110, 100) is None and harga_terindeks(None, 1, 1, 1, 1) is None and harga_terindeks(100, 1, 0, 1, 1) is None
    # jaringan tiruan: kunci tidak bocor, tanpa kunci = menunggu
    RAHASIA = "kunci-uji-123"
    n = {"jalur": []}

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            n["jalur"].append(self.path)
            ok = self.path.endswith("/key/" + RAHASIA) and "/ikk" in self.path
            b = json.dumps(ikk).encode() if ok else b""
            self.send_response(200 if ok else 404)
            self.end_headers()
            self.wfile.write(b)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    u = f"http://127.0.0.1:{srv.server_port}"
    t = [0.0]

    def zzz(d):
        t[0] += d
    kl = P.Klien(tidur=zzz, jam=lambda: t[0])
    with tempfile.TemporaryDirectory() as m, tempfile.TemporaryDirectory() as o:
        os.environ.pop("BPS_API_KEY", None)
        r = jalankan(["ikk"], kl, m, o, base=u + "/ikk", tanggal="2026-11-10")
        assert r["ikk"]["status"] == "menunggu" and not n["jalur"] and not os.listdir(m), "tanpa kunci: tanpa jaringan, tanpa berkas"
        r = jalankan(["ikk"], kl, m, o, base=u + "/ikk", kunci="salah", tanggal="2026-11-10")
        assert r["ikk"]["status"] == "menunggu" and "salah" not in r["ikk"]["alasan"].replace("gagal", "") and "***" in r["ikk"]["alasan"], r
        r = jalankan(["ikk"], kl, m, o, base=u + "/ikk", kunci=RAHASIA, tanggal="2026-11-10")
        assert r["ikk"]["status"] == "ok" and r["ikk"]["kab_tak_terpetakan"] == 1, r
        semua = "".join(open(os.path.join(a, f), errors="ignore").read() for d in (m, o) for a, _, fs in os.walk(d) for f in fs)
        assert RAHASIA not in semua, "kunci tidak boleh tertulis di berkas"
        b = json.load(open(os.path.join(o, "siklus/bersih/bps/ikk.json")))
        assert b["yakin"] == "resmi" and b["atribusi"].startswith("Sumber: BPS")
        l = json.load(open(os.path.join(o, "siklus/bersih/bps/laporan.json")))
        assert l["masuk"] == l["tersisa"] + l["dibuang_total"] == 8
    srv.shutdown()
    print("bps: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["ambil"]:
        P = _muat("panen")
        arg = lambda k, d: a[a.index(k) + 1] if k in a else d
        r = jalankan(["ikk", "ihpb"], P.Klien(), arg("--mentah", os.path.join(AB, "mentah")), arg("--keluar", os.path.join(AB, "keluar")))
        print(json.dumps(r, ensure_ascii=False))
    else:
        sys.exit("pakai: bps.py ambil [--mentah DIR] [--keluar DIR] | uji")
