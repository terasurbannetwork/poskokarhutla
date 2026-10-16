"""Analisis post media sosial kurasi admin (IG/X/Threads) -> <data>/sosmed.json.

Sumber: GET {SITUS}/api/sosmed?bencana=<id> (tersimpan di D1, dikurasi admin). Jalur analisis PERSIS yang dipakai:
 1. Bahasa: L.bahasa({"judul": caption}) (tanpa 'ed'). id -> praolah() lalu leksikon Indonesia; en -> leksikon *_EN, relevan_int,
    TOPIK_RE_EN, emosi(.., "en"). Jalur ms diperlakukan id seperti berita.
 2. praolah() (id saja): ga/gak/gk/tdk/tak -> tidak, blm -> belum, bgt -> banget, '#' dibuang dan hashtag dikenal dipisah
    (#kabutasap -> kabut asap), "padam2" -> "padam padam" (hanya a-z murni >= 3 huruf + "2").
 3. Geo.cari(teks); prov dari admin ditaruh di depan lalu digabung.
 4. Relevan = L.relevan / relevan_int(teks, geo) ATAU teks (setelah praolah) memuat kata inti R_INTI (api, asap, padam, bakar, ...):
    post ini kurasi admin, jadi relevan() berita terlalu ketat untuk caption gaul. Tak relevan: relevan=false, tanpa label/topik/emosi, tak masuk nada/topik/emosi/cerita/prov
    ringkasan; tetap di per_hari/platform/akun.
 5. Nada = LEKSIKON (scripts/umum/berita.py skor() + SITUASI/RESPONS), kalimat pertama = judul (bobot 2), sisanya ringkas (1).
    Wilayah Inggris: tak ada cara murah di Geo untuk nama pulau ("Sumatra", "Kalimantan"); hanya provinsi/kabupaten
    (Riau, South Sumatra, ...) yang terbaca. Dibiarkan; prov admin menutup celahnya.
    Model terlatih berita (latih_nada di scripts/data/berita.py) TIDAK dipakai: ia tidak disimpan ke disk, dilatih ulang tiap
    jalan dari label di data/raw (CV + bootstrap, mahal) dan hanya dilatih/diuji pada judul Indonesia, bukan caption. Maka
    sentimen_teruji=false: layar menyembunyikan persentase nada.
 6. topik pada teks penuh, emosi pada teks penuh (berita: judul), kelompok() berita dibatasi: relevan, >= 5 token kunci, dan
    anggota sewilayah (prov/kab) dengan pemimpin cerita; selain itu cerita=null.
 7. Semua ringkasan (n, n_teks, n_relevan, per_hari, platform, akun, prov, topik, nada, emosi, cerita) hanya memuat jendela 30 hari
    WIB; post lebih tua tetap di daftar post (n_semua = panjang daftar).

Pakai:  python3 scripts/umum/sosmed.py [--bencana karhutla]   ambil, olah, tulis (SITUS= untuk ganti URL dasar)
        python3 scripts/umum/sosmed.py --uji                  self-check tanpa jaringan
Sumber gagal / bukan JSON yang diharapkan: keluar 0 diam-diam, berkas lama tetap. n=0 tetap ditulis (admin menghapus semua post
= layar harus ikut kosong); layar membuang bagian analisis bila n=0.
Stdlib saja.
"""
import datetime as dt, importlib.util, json, os, re, sys, urllib.parse, urllib.request
from collections import Counter

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
SITUS = "https://poskokarhutla.terasurbannetwork.workers.dev"
SUMBER = "Post publik kurasi admin (Instagram, X, Threads)"
HARI = 30


def _muat(rel, nama):
    if nama in sys.modules:
        return sys.modules[nama]
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(sp); sys.modules[nama] = m; sp.loader.exec_module(m)
    return m


U = _muat("scripts/umum/berita.py", "umum_berita")  # nama sama dengan yang dipakai scripts/berita/karhutla.py


def ambil(bencana, situs=None):
    url = (situs or os.environ.get("SITUS") or SITUS).rstrip("/") + "/api/sosmed?" + urllib.parse.urlencode({"bencana": bencana})
    req = urllib.request.Request(url, headers={"User-Agent": U.UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.load(r)
    if not isinstance(d, dict) or not isinstance(d.get("post"), list):
        raise ValueError("bentuk respons tak dikenal")
    return d["post"]


def pusat_geo(L):
    for rel in (os.path.join("data/raw/berita", "pusat.json"), os.path.join("data/raw/berita", L.ID, "pusat.json")):
        p = os.path.join(AKAR, rel)
        if os.path.exists(p):
            return U.Geo(L.PROVINSI, json.load(open(p)))
    return U.Geo(L.PROVINSI)  # hitung dari public/geo/kecamatan


# ---- pra-normalisasi caption (daftar kecil, hanya jalur Indonesia)
SINGKAT = {"ga": "tidak", "gak": "tidak", "gk": "tidak", "tdk": "tidak", "tak": "tidak", "blm": "belum", "bgt": "banget"}
HASHTAG = {"kabutasap": "kabut asap", "karhutla": "karhutla", "kebakaranhutan": "kebakaran hutan", "kebakaranlahan": "kebakaran lahan",
           "kebakarangambut": "kebakaran gambut", "titikpanas": "titik panas", "waterbombing": "water bombing", "asapkiriman": "asap kiriman"}


# kata inti api/asap: post kurasi admin dianggap relevan bila memuat salah satunya meski L.relevan menolak
R_INTI = re.compile(r"\b(api|asap|kabut|hotspot|gambut|jerebu|fire|fires|haze|smoke|blaze)\b|padam|bakar|titik panas")


def praolah(teks):
    """'#KabutAsap gk padam2 blm' -> 'kabut asap tidak padam padam belum'. Hashtag dikenal dipisah, selebihnya dipisah di huruf besar."""
    t = re.sub(r"#(\w+)", lambda m: " " + (HASHTAG.get(m.group(1).lower()) or re.sub(r"(?<=[a-z])(?=[A-Z])", " ", m.group(1))) + " ", teks)
    t = re.sub(r"(?<![0-9A-Za-z])([A-Za-z]{3,})2(?![0-9A-Za-z])", r"\1 \1", t)
    t = re.sub(r"\b[A-Za-z]+\b", lambda m: SINGKAT.get(m.group(0).lower(), m.group(0)), t)
    return re.sub(r"\s+", " ", t).strip()


def judul_ringkas(teks):
    """Kalimat/baris pertama = 'judul' (bobot 2), sisanya 'ringkas' (bobot 1), seperti artikel berita."""
    j = re.split(r"(?<=[.!?])\s+|\n+", teks.strip(), maxsplit=1)
    return j[0], (j[1] if len(j) > 1 else "")


def olah(posts, L, geo, sekarang):
    """posts mentah API -> dict sosmed.json (tanpa 'dibuat'). Ringkasan hanya memuat jendela HARI hari WIB."""
    hari = [(sekarang - dt.timedelta(days=i)).date().isoformat() for i in range(HARI - 1, -1, -1)]
    art = []
    for p in posts:
        t = dt.datetime.fromtimestamp(int(p["dibuat"]) / 1000, WIB)
        asli = (p.get("teks") or "").strip()
        x = {"id": p["id"], "platform": p["platform"], "akun": p.get("akun") or None, "tgl": t.isoformat(timespec="minutes"), "_t": t,
             "prov": [p["prov"]] if p.get("prov") else [], "kab": [], "bahasa": None, "relevan": None, "topik": None, "label_situasi": None,
             "label_respons": None, "emosi": None, "cerita": None, "_k": set(), "_e": set(), "_dalam": t.date().isoformat() in hari}
        art.append(x)
        if not asli:
            continue
        bhs = L.bahasa({"judul": asli}) if hasattr(L, "bahasa") else "id"
        teks = praolah(asli) if bhs == "id" else asli
        g = geo.cari(teks if bhs == "id" else re.sub(r"(?i)\bjakarta\b", " ", teks))  # "Jakarta" di teks asing = pusat
        x["prov"] = list(dict.fromkeys(x["prov"] + g["prov"])); x["kab"] = g["kab"]; x["bahasa"] = bhs  # prov admin menang (di depan)
        gm = dict(g, prov=x["prov"])
        ok = (L.relevan_int(teks, gm, "")[0] if bhs == "en" and hasattr(L, "relevan_int") else L.relevan(teks, gm)[0]) or R_INTI.search(U.norm(teks))
        x["relevan"] = bool(ok)
        if not ok:
            continue
        en = bhs == "en" and hasattr(L, "SITUASI_EN")
        ls, lr = (L.SITUASI_EN, L.RESPONS_EN) if en else (L.SITUASI, L.RESPONS)
        j, r = judul_ringkas(teks)
        sf = getattr(L, "saring", None)
        x.update(topik=U.topik(teks, L.TOPIK_RE_EN if en else L.TOPIK_RE), label_situasi=U.label(U.skor(j, r, ls, sf)[0]),
                 label_respons=U.label(U.skor(j, r, lr, sf)[0]), emosi=L.emosi(teks, "en" if en else "id") if hasattr(L, "emosi") else [],
                 _k=U.kunci_judul(teks), _e=set(g["kec"] or g["kab"]), _teks=teks)

    # cerita: relevan + bertulisan + dalam jendela + >= 5 token kunci; anggota harus sewilayah (prov/kab) dengan pemimpin cerita
    bt = [x for x in art if x["_dalam"] and x["relevan"] and len(x["_k"]) >= 5]
    grup = {}
    for x, r in zip(bt, U.kelompok(bt)):
        grup.setdefault(r, []).append(x)
    cerita = []
    wil = lambda x: set(x["prov"]) | set(x["kab"])
    for g in grup.values():
        g.sort(key=lambda x: x["_t"])
        subs = []  # pecah per wilayah: tiap post masuk sub-grup yang pemimpinnya sewilayah, kalau tidak membuka sub-grup baru
        for x in g:
            for sg in subs:
                if wil(x) & wil(sg[0]):
                    sg.append(x); break
            else:
                subs.append([x])  # post tanpa wilayah selalu sub-grup sendiri
        for sg in subs:
            if len(sg) < 2:
                continue
            cid = "S" + sg[0]["id"]
            for x in sg:
                x["cerita"] = cid
            cerita.append({"id": cid, "n": len(sg), "n_akun": len({x["akun"] for x in sg if x["akun"]}), "awal": sg[0]["tgl"], "akhir": sg[-1]["tgl"],
                           "prov": list(dict.fromkeys(p for x in sg for p in x["prov"])),
                           "topik": [t for t, _ in Counter(t for x in sg for t in x["topik"]).most_common(3)], "contoh": sg[0]["_teks"][:140]})
    cerita.sort(key=lambda c: -c["n"])

    dlm = [x for x in art if x["_dalam"]]
    lab = [x for x in dlm if x["relevan"]]
    per_hari = Counter(x["tgl"][:10] for x in dlm)  # tgl sudah WIB
    ringkas = {"per_hari": {d: per_hari.get(d, 0) for d in hari},
               "platform": dict(Counter(x["platform"] for x in dlm).most_common()),
               "akun": [[a, n] for a, n in Counter(x["akun"] for x in dlm if x["akun"]).most_common(10)],
               "prov": [[k, n] for k, n in Counter(p for x in dlm if x["relevan"] is not False for p in x["prov"]).most_common()],
               "topik": [[k, n] for k, n in Counter(t for x in lab for t in x["topik"]).most_common()],
               "nada": {"situasi": dict(Counter(x["label_situasi"] for x in lab)), "respons": dict(Counter(x["label_respons"] for x in lab))},
               "emosi": dict(Counter(e for x in lab for e in x["emosi"]).most_common()),
               "n_teks": sum(1 for x in dlm if x["relevan"] is not None), "n_relevan": len(lab), "cerita": cerita[:10]}
    art.sort(key=lambda x: x["_t"], reverse=True)
    keluar = [{k: v for k, v in x.items() if not k.startswith("_")} for x in art]
    return {"sumber": SUMBER, "bencana": L.ID, "sentimen_teruji": False, "n": len(dlm), "n_semua": len(keluar), "post": keluar, "ringkas": ringkas}


def main(argv):
    if "--uji" in argv:
        return uji()
    bencana = argv[argv.index("--bencana") + 1] if "--bencana" in argv else "karhutla"
    try:
        posts = ambil(bencana)
    except Exception as e:
        print("sosmed: sumber gagal, berkas lama tetap:", e, file=sys.stderr)
        return 0
    L = U.muat(f"scripts/berita/{bencana}.py", "berita_" + bencana)
    sekarang = dt.datetime.now(WIB)
    out = {"dibuat": sekarang.isoformat(timespec="minutes"), **olah(posts, L, pusat_geo(L), sekarang)}
    d = os.path.join(AKAR, getattr(L, "DATA", "public/data"))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "sosmed.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"sosmed: {out['n']} post ({out['ringkas']['n_teks']} bertulisan)", file=sys.stderr)
    return 0


def uji():
    L = U.muat("scripts/berita/karhutla.py", "berita_karhutla")
    geo = pusat_geo(L)
    skr = dt.datetime(2026, 10, 16, 12, 0, tzinfo=WIB)
    ms = lambda y, m, d, h, mi: int(dt.datetime(y, m, d, h, mi, tzinfo=WIB).timestamp() * 1000)
    # 3. pra-normalisasi
    assert praolah("gk ada api, blm padam2 bgt #KabutAsap #Karhutla tdk #KebakaranGambut G pa3dam2 x9padam2") == \
        "tidak ada api, belum padam padam banget kabut asap karhutla tidak kebakaran gambut G pa3dam2 x9padam2", praolah("gk ada api, blm padam2 bgt #KabutAsap #Karhutla tdk #KebakaranGambut G pa3dam2 x9padam2")
    assert U.label(U.skor(*judul_ringkas(praolah("api gak padam"))[:2], L.SITUASI, L.saring)[0]) == "negatif"  # negasi terbaca setelah "gak" -> "tidak"
    # 4. bobot: kalimat pertama judul
    assert judul_ringkas("Api meluas. Hujan turun.\nPadam") == ("Api meluas.", "Hujan turun.\nPadam") and judul_ringkas("Api meluas") == ("Api meluas", "")
    teks1 = "Api berhasil dipadamkan, hujan turun di kebakaran hutan Riau"
    teks_b = "Kebakaran hutan Riau terparah. Api berhasil dipadamkan, hujan turun reda terkendali"
    P = [{"id": "a", "platform": "x", "akun": "bnpb", "teks": teks1, "prov": None, "dibuat": ms(2026, 10, 15, 23, 59)},
         {"id": "b", "platform": "instagram", "akun": "warga", "teks": None, "prov": "62", "dibuat": ms(2026, 10, 16, 0, 0)},
         {"id": "c", "platform": "threads", "akun": None, "teks": "Kabut asap pekat selimuti kota, ISPA korban bertambah", "prov": "16", "dibuat": ms(2026, 10, 16, 8, 0)},
         {"id": "d", "platform": "x", "akun": "bnpb", "teks": teks1, "prov": None, "dibuat": ms(2026, 10, 16, 9, 0)},
         {"id": "e", "platform": "x", "akun": "pasar", "teks": "Harga cabai naik di pasar", "prov": None, "dibuat": ms(2026, 10, 16, 9, 30)},
         {"id": "f", "platform": "x", "akun": "intl", "teks": "The haze worsens as forest fires spread across Sumatra", "prov": None, "dibuat": ms(2026, 10, 16, 10, 0)},
         {"id": "g", "platform": "threads", "akun": "lama", "teks": teks1, "prov": None, "dibuat": ms(2026, 9, 1, 10, 0)},
         {"id": "h", "platform": "x", "akun": "bnpb", "teks": teks_b, "prov": None, "dibuat": ms(2026, 10, 16, 11, 0)},
         {"id": "i", "platform": "x", "akun": "x1", "teks": "#karhutla gk padam2 di riau", "prov": None, "dibuat": ms(2026, 10, 16, 11, 5)}]
    o = olah(P, L, geo, skr)
    by = {x["id"]: x for x in o["post"]}
    # paritas dengan mesin berita (judul=teks, ringkas kosong)
    h = U.olah_ringan([{"id": "z", "judul": teks1, "ringkas": "", "sumber": "s", "url": "u", "tgl": skr.isoformat()}], skr, geo, L)["_semua"][0]
    assert (by["a"]["label_situasi"], by["a"]["label_respons"], by["a"]["topik"]) == (h["label_situasi"], h["label_respons"], h["topik"]), (by["a"], h)
    assert by["a"]["label_situasi"] == "positif" and "14" in by["a"]["prov"] and by["a"]["relevan"] is True, by["a"]
    # 4. bobot dipakai: judul + ringkas, bukan seluruhnya sebagai judul
    j, r = judul_ringkas(teks_b)
    assert by["h"]["label_situasi"] == U.label(U.skor(j, r, L.SITUASI, L.saring)[0]), by["h"]
    assert U.skor(j, r, L.SITUASI, L.saring)[0] != U.skor(teks_b, "", L.SITUASI, L.saring)[0]
    assert by["c"]["prov"][0] == "16" and by["c"]["label_situasi"] == "negatif", by["c"]  # prov admin di depan
    assert by["b"]["prov"] == ["62"] and by["b"]["relevan"] is None and by["b"]["topik"] is None and by["b"]["label_situasi"] is None and by["b"]["emosi"] is None
    # 2. relevansi
    e = by["e"]
    assert e["relevan"] is False and e["topik"] is None and e["label_situasi"] is None and e["emosi"] is None and e["cerita"] is None, e
    # 1. bahasa: jalur Inggris
    f = by["f"]
    assert f["bahasa"] == "en" and f["relevan"] is True and f["label_situasi"] == "negatif" and "asap_kesehatan" in f["topik"] and "cemas" in f["emosi"], f
    assert by["a"]["bahasa"] == "id"
    # 3. praolah terpakai: "gk padam2" -> tidak padam padam (negasi membalik "padam" positif)
    assert by["i"]["label_situasi"] == "negatif" and "karhutla" not in (by["i"]["prov"]), by["i"]
    r = o["ringkas"]
    assert by["a"]["tgl"].startswith("2026-10-15") and by["b"]["tgl"].startswith("2026-10-16"), "batas tengah malam WIB"
    assert o["sentimen_teruji"] is False
    # 5. jendela 30 hari: post 'g' (1 Sep) ada di daftar, tidak di ringkasan
    assert o["n_semua"] == 9 and o["n"] == 8, (o["n"], o["n_semua"])
    assert "2026-09-01" not in r["per_hari"] and len(r["per_hari"]) == HARI and sum(r["per_hari"].values()) == 8
    assert r["per_hari"]["2026-10-15"] == 1 and r["per_hari"]["2026-10-16"] == 7, r["per_hari"]
    assert r["platform"] == {"x": 6, "instagram": 1, "threads": 1}, r["platform"]
    assert r["akun"][0] == ["bnpb", 3] and ["lama", 1] not in r["akun"], r["akun"]
    assert r["n_teks"] == 7 and r["n_relevan"] == 6 and sum(r["nada"]["situasi"].values()) == 6, r  # b tanpa teks, e tak relevan
    assert sum(n for _, n in r["topik"]) >= 6 and sum(r["emosi"].values()) >= 1
    assert all(p != "14" or n >= 3 for p, n in r["prov"])
    # 6. cerita: a & d sama wilayah (14) & >= 5 token -> satu cerita; sama teks tapi 'g' di luar jendela tidak ikut
    assert by["a"]["cerita"] == by["d"]["cerita"] and by["a"]["cerita"] and by["g"]["cerita"] is None and by["e"]["cerita"] is None
    assert by["c"]["cerita"] is None and r["cerita"][0]["n"] == 3 and by["h"]["cerita"] == by["a"]["cerita"], r["cerita"]  # h mirip a/d (Jaccard)
    # 6. beda wilayah: teks sama tapi prov admin 62 vs 14 (geo teks 'riau' hilang agar tak sewilayah)
    t5 = "Kabut asap pekat kepung kota sejak pagi tadi"
    Q = [{"id": "p", "platform": "x", "akun": "q1", "teks": t5, "prov": "62", "dibuat": ms(2026, 10, 16, 8, 0)},
         {"id": "q", "platform": "x", "akun": "q2", "teks": t5, "prov": "16", "dibuat": ms(2026, 10, 16, 8, 30)},
         {"id": "r", "platform": "x", "akun": "q3", "teks": t5, "prov": "62", "dibuat": ms(2026, 10, 16, 9, 0)},
         {"id": "s", "platform": "x", "akun": "q4", "teks": "Kabut asap pekat Riau", "prov": "14", "dibuat": ms(2026, 10, 16, 9, 0)},
         {"id": "t", "platform": "x", "akun": "q5", "teks": "Kabut asap pekat Riau", "prov": "14", "dibuat": ms(2026, 10, 16, 9, 1)}]
    oq = {x["id"]: x for x in olah(Q, L, geo, skr)["post"]}
    assert oq["p"]["cerita"] == oq["r"]["cerita"] and oq["p"]["cerita"] and oq["q"]["cerita"] is None, oq
    assert oq["s"]["cerita"] is None and oq["t"]["cerita"] is None, "kurang dari 5 token kunci"
    assert olah([], L, geo, skr)["n"] == 0
    # urutan A,B,B,A: dua cerita (A+A, B+B), tak ada anggota hilang; post tanpa wilayah tak membuang siapa pun
    tA, tB = "Kabut asap pekat kepung kota sejak pagi tadi", "Kabut asap pekat kepung kota sejak pagi ini"
    R = [{"id": i, "platform": "x", "akun": i, "teks": tx, "prov": pv, "dibuat": ms(2026, 10, 16, 6, k)}
         for k, (i, tx, pv) in enumerate([("a1", tA, "62"), ("b1", tB, "16"), ("b2", tB, "16"), ("a2", tA, "62"), ("n1", tA, None)])]
    orr = {x["id"]: x for x in olah(R, L, geo, skr)["post"]}
    assert orr["a1"]["cerita"] == orr["a2"]["cerita"] and orr["b1"]["cerita"] == orr["b2"]["cerita"], orr
    assert orr["a1"]["cerita"] and orr["b1"]["cerita"] and orr["a1"]["cerita"] != orr["b1"]["cerita"] and orr["n1"]["cerita"] is None
    # recall relevansi (kurasi admin): gaul tetap relevan, bukan-api tidak
    G = [{"id": "g1", "platform": "x", "akun": "u", "teks": "Api gak bisa dipadamin di Pelalawan, warga panik!", "prov": None, "dibuat": ms(2026, 10, 16, 7, 0)},
         {"id": "g2", "platform": "x", "akun": "u", "teks": "Alhamdulillah api udah padam di OKI", "prov": None, "dibuat": ms(2026, 10, 16, 7, 1)},
         {"id": "g3", "platform": "x", "akun": "u", "teks": "Harga cabai naik", "prov": None, "dibuat": ms(2026, 10, 16, 7, 2)}]
    og = {x["id"]: x for x in olah(G, L, geo, skr)["post"]}
    assert og["g1"]["relevan"] is True and og["g2"]["relevan"] is True and og["g3"]["relevan"] is False, og
    print("umum/sosmed.py uji: ok")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
