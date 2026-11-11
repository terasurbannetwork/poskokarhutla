"""Alur Kaji Cepat ujung ke ujung (SK-056), SATU uji dengan server tiruan HTTP sungguhan tanpa jaringan luar:
kejadian hidup (banjir, karhutla, gempa USGS + BMKG) masuk -> peta KJ- di sk_kejadian_sumber -> paparan kejadian -> kaji banjir dan gempa terkirim.
Urutan job kaji (persis; semua dry-run kecuali --kirim; tidak ada unggah selain gudang.py sinkron di akhir):
  panen.py usgs-shakemap --mentah $S/siklus/mentah
  pasang.py masuk --hidup --basis $BASIS --mentah $S/siklus/mentah --kirim
  paparan.py kejadian $S
  kaji_gempa.py kirim --mentah $S/siklus/mentah --basis $BASIS --keluar $S --kirim
  kaji_banjir.py kirim --paparan $S/siklus/saji/paparan --basis $BASIS --keluar $S --kirim
  gudang.py sinkron $S --wrangler $W
Pakai: python3 -I scripts/siklus/alur.py uji
"""
import datetime as dt, http.server, importlib.util, json, os, sys, tempfile, threading

AB = os.path.dirname(os.path.abspath(__file__))
TOKEN = "tok-uji"


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _uji():
    P, H, G, B, PA = (_muat(n) for n in ("pasang", "hidup", "kaji_gempa", "kaji_banjir", "paparan"))
    ms = int(dt.datetime(2026, 11, 9, 23, 30, tzinfo=dt.timezone.utc).timestamp() * 1000)
    cari = lambda lon, lat: ("33", "Cilacap", "A") if lon > 100 else None
    st = {"kj": [], "sm": [], "kaji": [], "salah_token": 0}

    class S(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _balas(self, kode, isi):
            b = json.dumps(isi).encode()
            self.send_response(kode)
            self.end_headers()
            self.wfile.write(b)

        def do_GET(self):
            if self.path.startswith("/api/gempa/kejadian"):      # publik, tanpa token
                return self._balas(200, {"kejadian": [{"utama_id": "u:us1", "lat": -7.7, "lon": 109.0, "mulai": "2026-11-09T23:30:00.000Z"},
                                                      {"utama_id": "b:2026-11-10|x", "lat": -7.7, "lon": 109.0, "mulai": "2026-11-09T23:31:00.000Z"}]})
            if self.headers.get("Authorization") != "Bearer " + TOKEN:
                st["salah_token"] += 1
                return self._balas(401, {"galat": "token"})
            self._balas(200, {"baris": st["kj" if "/ingest/jendela" in self.path else "sm"], "lanjut": None})

        def do_POST(self):
            if self.headers.get("Authorization") != "Bearer " + TOKEN:
                st["salah_token"] += 1
                return self._balas(401, {"galat": "token"})
            isi = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            if self.path.endswith("/ingest/kaji"):
                st["kaji"].append(isi)
                return self._balas(201, {"status": 201})
            for k in isi["keputusan"]:
                if any((s["sumber"], s["kode"]) == (k["sumber"], k["kode"]) for s in st["sm"]):
                    continue
                if k["aksi"] == "tambah":
                    assert any(x["id"] == k["kejadian_id"] for x in st["kj"]), "tambah ke ID yang belum ada"
                if k["aksi"] == "baru":
                    k["kejadian_id"] = P.id_bebas(P.kunci_pendiri(k["jenis"].split("+"), k["kab4"], k["mulai"]), {x["id"] for x in st["kj"]})
                    st["kj"].append({"id": k["kejadian_id"], "jenis": k["jenis"], "kab4": k["kab4"], "mulai": k["mulai"], "fase": "terdeteksi"})
                st["sm"].append({"sumber": k["sumber"], "kode": k["kode"], "kejadian_id": k.get("kejadian_id"),
                                 "status": "terpasang" if k.get("kejadian_id") else k["aksi"]})
            self._balas(201, {})

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), S)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    basis = f"http://127.0.0.1:{srv.server_port}"
    os.environ["PIPA_TOKEN"] = TOKEN
    http_ = P._http(TOKEN)
    persegi = {"type": "Polygon", "coordinates": [[[99.9995, -1.0005], [100.0015, -1.0005], [100.0015, -0.9995], [99.9995, -0.9995], [99.9995, -1.0005]]]}
    hari = dt.date.today().isoformat()
    cont = {"type": "FeatureCollection", "features": [{"properties": {"value": 7}, "geometry": {"type": "LineString", "coordinates": [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]}}]}
    with tempfile.TemporaryDirectory() as akar, tempfile.TemporaryDirectory() as S_:
        for d in ("public/banjir/data", "public/data", "mentah/usgs-shakemap/2026"):
            os.makedirs(os.path.join(akar, d))
        awal = {"kejadian": [{"kode": "B0007", "sejak": hari, "kec": ["33|Cilacap|A"]}]}
        geo = {"features": [{"properties": {"kode": "B0007"}, "geometry": persegi}]}
        json.dump(awal, open(os.path.join(akar, "public/banjir/data/kejadian_aktif_awal.json"), "w"))
        json.dump({"features": [{"properties": {"lat": -2.505, "lon": 114.003, "n24": 4, "prov": "62", "kab": "Kotawaringin Timur", "awal": hari + "T01:00:00+00:00"}}]},
                  open(os.path.join(akar, "public/data/kluster_awal.json"), "w"))
        gempa = [{"id": "us1", "mag": 6.5, "waktu": ms, "status": "ok", "cont_mmi": cont, "lat": -7.7, "lon": 109.0}]
        json.dump({"gempa": gempa}, open(os.path.join(akar, "mentah/usgs-shakemap/2026/2026-11-10.json"), "w"))
        # 1. masuk hidup: dry-run bawaan tidak menulis; --kirim menulis; ulang = nol baris baru
        a0 = ["masuk", "--hidup", "--basis", basis, "--akar", akar, "--mentah", os.path.join(akar, "mentah"), "--dari", "2026-11-01"]
        P._masuk_hidup(a0, cari)
        assert st["kj"] == [] and st["sm"] == [], "dry-run bawaan"
        P._masuk_hidup(a0 + ["--kirim"], cari)
        P._masuk_hidup(a0 + ["--kirim"], cari)           # putaran 2: BMKG b: dipasang ke KJ gempa USGS
        n = len(st["sm"])
        P._masuk_hidup(a0 + ["--kirim"], cari)
        assert len(st["sm"]) == n, "jalan ulang = nol baris baru"
        peta = {(s["sumber"], s["kode"]): s["kejadian_id"] for s in st["sm"]}
        assert {k[0] for k in peta} == {"banjir", "karhutla", "usgs", "bmkg"} and ("karhutla", "sel:-126:5700") in peta, peta
        assert peta[("usgs", "us1")] == peta[("bmkg", "b:2026-11-10|x")], "BMKG dan USGS satu gempa = satu KJ-"
        assert len(st["kj"]) == 3 and all(k["id"].startswith("KJ-2026-") for k in st["kj"]), st["kj"]
        # 2. paparan kejadian (grid tiruan) -> paparan/B0007.json; 3. kaji
        sel_fn = lambda prov, k4: ([(0, 0, 100, 5000, "A", 100.0, -1.0)], 0, 0, .001, "Cilacap", None)
        hs, ms_ = PA.jalankan_kejadian(S_, awal, geo, None, sel_fn, lambda *x: [], {"33|Cilacap|A": 1000})
        assert hs == [("B0007", "ok")] and ms_ == []
        baris = G.tarik_sumber(http_, basis, "2026-11-01", "2026-11-30")
        assert {(b["sumber"], b["kode"]) for b in baris} == set(peta), "peta KJ- terbaca lewat jalur ingest/sumber"
        mb, lb = B.rencana(awal["kejadian"], baris, os.path.join(S_, "siklus/saji/paparan"), S_)
        pusat, pend = {"A": [5, 5]}, {"A": 1_000_000}
        mg, lg = G.rencana(gempa, baris, pusat, pend, S_)
        assert lb == [] and lg == [] and [m["kejadian_id"] for m in mb] == [peta[("banjir", "B0007")]] and [m["kejadian_id"] for m in mg] == [peta[("usgs", "us1")]]
        assert all(os.path.exists(os.path.join(S_, m["hasil_r2"])) for m in mb + mg) and mb[0]["ringkas"]["rentang"] == [1000, 1000]
        assert [x[1] for x in G.kirim(mb + mg, basis, http_)] == ["dry-run: rentang [1000, 1000]", "dry-run: rentang %s" % mg[0]["ringkas"]["rentang"]] and st["kaji"] == []
        assert all(r == {"status": 201} for _, r in G.kirim(mb + mg, basis, http_, True)) and {k["model"] for k in st["kaji"]} == {"banjir_jam1", "gempa"}
        assert {k["kejadian_id"] for k in st["kaji"]} == {peta[("banjir", "B0007")], peta[("usgs", "us1")]}
        # penolakan: grid hilang = menunggu (tidak dikirim, bukan nol); menunggu_data ditolak lokal; token salah ditolak server
        hs, _ = PA.jalankan_kejadian(S_, awal, geo, None, lambda p, k: (_ for _ in ()).throw(FileNotFoundError("halus")), lambda *x: [], {})
        assert hs[0][1].startswith("menunggu") and B.rencana(awal["kejadian"], baris, os.path.join(S_, "siklus/saji/paparan"), None)[0] == []
        assert G.kirim([{**mg[0], "status": "menunggu_data"}], basis, http_, True)[0][1].startswith("DITOLAK") and len(st["kaji"]) == 2
        try:
            P._http("salah")("POST", basis + "/api/siklus/ingest/kaji", mg[0])
            raise AssertionError("token salah harus ditolak")
        except SystemExit as e:   # pasang._http mengubah HTTPError jadi SystemExit beralasan (02f53b94a)
            assert "HTTP 401" in str(e) and len(st["kaji"]) == 2
    srv.shutdown()
    print("alur: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: alur.py uji")
