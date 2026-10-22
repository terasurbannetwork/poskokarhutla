"""TikTok (mentah tiktok.mjs) -> public/data/medsos_tiktok.json, bentuk artikel berita (bahan peringatan_berita.py).

Mentah: data/raw/medsos/tiktok/<YYYY-MM-DD>.json {tagar: {tagar: [{id, akun, teks, url}]}}; dibaca 7 hari terakhir, dedup per id video.
Keputusan: TAGAR PENCARIAN (karhutla, kabutasap, kebakaranhutan, kebakaranlahan) dan tagar pengisi (fyp, foryou, viral, prayfor*)
dibuang dari teks sebelum klasifikasi, sebab semua post hasil pencarian memuatnya dan otomatis akan cocok kata bahaya. `judul` =
keterangan bersih itu (maks 300 huruf), dipakai untuk tampilan DAN klasifikasi; satu teks, tidak ada field ganda. Tagar lain tetap.
Lokasi: Geo.cari pada teks asli yang sudah praolah (sosmed.praolah: ga->tidak, hashtag dipisah) ditambah pemecahan tagar huruf kecil
tersambung ("#palangkarayakotacantik" -> "palangka raya"): frasa wilayah terpanjang (>= 7 huruf) yang termuat di tagar.
Waktu unggah = (id video >> 32) detik Unix, dipetakan ke WIB.
Pakai: python3 scripts/umum/tiktok.py [uji]. Stdlib saja.
"""
import datetime as dt, glob, importlib.util, json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
HARI, MAKS_JUDUL = 7, 300
KELUAR = os.path.join(AKAR, "public/data/medsos_tiktok.json")
TAGAR_CARI = re.compile(r"#(karhutla|kabutasap|kebakaranhutan|kebakaranlahan|fyp\w*|foryou\w*|viral\w*|prayfor\w*|xyzbca\w*)\b", re.I)


def _muat(rel, nama):
    if nama in sys.modules:
        return sys.modules[nama]
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(sp); sys.modules[nama] = m; sp.loader.exec_module(m)
    return m


S = _muat("scripts/umum/sosmed.py", "umum_sosmed")
U = S.U


def waktu_id(i):
    """Waktu unggah dari id video TikTok (32 bit atas = detik Unix)."""
    return dt.datetime.fromtimestamp(int(i) >> 32, WIB)


def urai_alt(alt):
    """'<keterangan> dibuat oleh <akun> dengan suara asli - ...' -> keterangan."""
    return alt.split(" dibuat oleh ")[0].strip()


def bersih(teks):
    """Buang tagar pencarian/pengisi dan rapikan spasi."""
    return re.sub(r"\s+", " ", TAGAR_CARI.sub(" ", teks)).strip()


def pecah_tagar(teks, geo):
    """Tagar huruf kecil tersambung -> frasa wilayah terpanjang (>= 7 huruf) yang termuat; iterasi atas sisanya."""
    if not hasattr(geo, "_ringkas"):
        geo._ringkas = sorted({(f.replace(" ", ""), f) for f in geo.frasa if len(f.replace(" ", "")) >= 7}, key=lambda x: -len(x[0]))
    tambah = []
    for h in re.findall(r"#(\w+)", teks):
        s = U.norm(h).replace(" ", "")
        for r, f in geo._ringkas:
            if r in s:
                tambah.append(f); s = s.replace(r, " ")
    return " ".join(tambah)


def artikel(p, geo):
    judul = bersih(p["teks"])[:MAKS_JUDUL].strip()
    if not judul:
        return None
    t = waktu_id(p["id"])
    asal = S.praolah(p["teks"])
    nama = re.sub(r"[._]+", " ", p["akun"])  # nama akun media sering memuat nama wilayah ("Metro TV" -> Kota Metro): bukan lokasi kejadian
    asal = re.sub("(?i)" + re.escape(nama), " ", asal)
    g = geo.cari(asal + " " + pecah_tagar(p["teks"], geo))
    return {"id": "tt" + str(p["id"]), "judul": judul, "sumber": "TikTok @" + p["akun"], "domain": "tiktok.com", "url": p["url"],
            "tgl": t.isoformat(timespec="minutes"), "ringkas": "", "prov": g["prov"], "kab": g["kab"], "kec": g["kec"],
            "lat": g["lat"], "lon": g["lon"], "presisi": g["presisi"]}


def baca_mentah(sekarang):
    """Mentah 7 hari terakhir -> {id: post}, tagar yang terlihat."""
    batas = (sekarang - dt.timedelta(days=HARI)).date().isoformat()
    post, tagar = {}, set()
    for f in sorted(glob.glob(os.path.join(AKAR, "data/raw/medsos/tiktok/*.json"))):
        if os.path.basename(f)[:10] < batas:
            continue
        for g, xs in json.load(open(f)).get("tagar", {}).items():
            tagar.add(g)
            for x in xs:
                post.setdefault(x["id"], x)
    return post, sorted(tagar)


def bangun(sekarang, geo):
    post, tagar = baca_mentah(sekarang)
    batas = sekarang - dt.timedelta(days=HARI)
    arts = [a for a in (artikel(p, geo) for p in post.values()) if a and dt.datetime.fromisoformat(a["tgl"]) >= batas]
    arts.sort(key=lambda a: a["tgl"], reverse=True)
    return {"dibuat": sekarang.isoformat(timespec="minutes"), "sumber": "TikTok, tagar publik", "tagar": tagar, "artikel": arts}


def uji():
    assert urai_alt("Api makin besar #karhutla dibuat oleh akunku dengan suara asli - akunku") == "Api makin besar #karhutla"
    assert waktu_id("7621234567890123456") == dt.datetime.fromtimestamp(7621234567890123456 >> 32, WIB)
    assert waktu_id(str(1_760_000_000 << 32)).isoformat() == "2025-10-09T15:53:20+07:00", waktu_id(str(1_760_000_000 << 32))
    assert bersih("Asap tebal #Karhutla #fyp #kabutasap #prayforriau #palangkaraya") == "Asap tebal #palangkaraya"
    assert bersih("#karhutla #viral") == ""
    geo = S.pusat_geo(U.muat("scripts/berita/karhutla.py", "berita_karhutla"))
    a = artikel({"id": str(1_760_000_000 << 32), "akun": "z", "teks": "Cantiknya #palangkarayakotacantik #karhutla #fyp", "url": "u"}, geo)
    assert a["judul"] == "Cantiknya #palangkarayakotacantik" and a["kab"] == ["62|Kota Palangkaraya"], a
    b = artikel({"id": str(1_760_000_000 << 32), "akun": "z", "teks": "kebakaran di Palangka Raya gak padam #karhutla", "url": "u"}, geo)
    assert b["kab"] == ["62|Kota Palangkaraya"] and b["sumber"] == "TikTok @z" and b["domain"] == "tiktok.com", b
    c = artikel({"id": "1", "akun": "metro_tv", "teks": "Metro TV melaporkan api di Sekayu Musi Banyuasin", "url": "u"}, geo)
    assert not any("Kota Metro" in k for k in c["kab"]), c
    assert artikel({"id": "1", "akun": "z", "teks": "#karhutla #fyp", "url": "u"}, geo) is None
    # dedup per id lintas hari
    import tempfile
    global AKAR
    lama = AKAR
    with tempfile.TemporaryDirectory() as d:
        AKAR = d
        os.makedirs(d + "/data/raw/medsos/tiktok")
        x = {"id": "5", "akun": "a", "teks": "t", "url": "u"}
        for n in ("2026-10-21", "2026-10-22"):
            json.dump({"tagar": {"karhutla": [x], "kabutasap": [x, dict(x, id="6")]}}, open(f"{d}/data/raw/medsos/tiktok/{n}.json", "w"))
        p, tg = baca_mentah(dt.datetime(2026, 10, 22, tzinfo=WIB))
        assert sorted(p) == ["5", "6"] and tg == ["kabutasap", "karhutla"], (p, tg)
    AKAR = lama
    print("ok tiktok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sk = dt.datetime.now(WIB)
        h = bangun(sk, S.pusat_geo(U.muat("scripts/berita/karhutla.py", "berita_karhutla")))
        os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
        json.dump(h, open(KELUAR + ".tmp", "w"), ensure_ascii=False, separators=(",", ":")); os.replace(KELUAR + ".tmp", KELUAR)
        print(f"medsos_tiktok.json: {len(h['artikel'])} artikel, {sum(bool(a['prov']) for a in h['artikel'])} berlokasi", file=sys.stderr)
