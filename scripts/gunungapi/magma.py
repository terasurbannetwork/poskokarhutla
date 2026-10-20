"""Gunung api Indonesia dari MAGMA Indonesia (PVMBG, Badan Geologi ESDM): level resmi, radius rekomendasi, letusan terbaru.

Diperiksa live 16 Okt 2026 (tidak ada API terbuka; yang ada halaman HTML publik):
  /v1/gunung-api/tingkat-aktivitas   daftar gunung per level (I Normal .. IV Awas) + tautan laporan bertanda tangan
  /v1/gunung-api/laporan/<id>?sig=   laporan harian: koordinat, ketinggian, rekomendasi (radius km)
  /v1/gunung-api/informasi-letusan   daftar letusan terbaru (waktu, gunung, ketinggian kolom abu)
Smithsonian GVP menjawab 403 dari luar peramban dan GDACS hanya memuat gunung berstatus kejadian (sedikit, banyak di luar negeri),
jadi dua-duanya tidak dipakai di sini. KRB (peta kawasan rawan bencana) hanya berupa unduhan gambar tanpa lisensi jelas: dibuang.

Keluaran: public/banjir/data/gunungapi_status.json. Katalog koordinat statis: public/gunungapi/data/gunung.json (di-commit; gunung baru
ditambahkan otomatis dari laporan hariannya). Level I Normal tidak punya cincin radius (laporannya tidak diambil).
Pemakaian:  python3 scripts/gunungapi/magma.py [uji]
"""
import datetime as dt, html, json, math, os, re, sys, time, urllib.parse, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BASIS = "https://magma.esdm.go.id"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KELUAR = os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")
KATALOG = os.path.join(AKAR, "public/gunungapi/data/gunung.json")
WIB = dt.timezone(dt.timedelta(hours=7))
ZONA = {"WIB": 7, "WITA": 8, "WIT": 9}
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}


MAKS_HTML = 5_000_000


def ambil(jalur, coba=3):
    url = jalur if jalur.startswith("http") else BASIS + jalur
    if urllib.parse.urlparse(url).hostname != urllib.parse.urlparse(BASIS).hostname:
        raise RuntimeError(f"tolak host di luar MAGMA: {url[:80]}")   # href hasil scrape tidak boleh membawa runner ke host lain
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "id"})
            with urllib.request.urlopen(req, timeout=40) as r:
                isi = r.read(MAKS_HTML + 1)
                if len(isi) > MAKS_HTML:
                    raise RuntimeError("halaman melebihi 5 MB")
                return isi.decode("utf-8", "replace")
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{jalur[:80]}: {e}")
            time.sleep(5 * (i + 1))


def teks(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def angka(s):
    return float(s.replace(",", "."))


def urai_tingkat(h):
    """Halaman tingkat aktivitas -> [{nama, prov, level, laporan}]. Tiap kelompok level dibuka judul 'Level IV (Awas)' dst;
    baris gunung: 'Nama - Provinsi[, Provinsi] <a href=laporan>'."""
    out = []
    for b in re.split(r'<a href="" class="tx-inverse tx-14 tx-medium d-block">Level ', h)[1:]:
        lv = {"IV": 4, "III": 3, "II": 2, "I": 1}[b.split(" ")[0]]
        for m in re.finditer(r"<td>\s*([^<]+?)\s*<a href=\"([^\"]+)\"", b):
            nama, _, prov = html.unescape(m.group(1)).partition(" - ")
            out.append({"nama": nama.strip(), "prov": prov.strip(), "level": lv, "laporan": html.unescape(m.group(2))})
    return out


def urai_laporan(h):
    """Laporan harian -> koordinat, ketinggian, radius rekomendasi (km), jarak sektor (km), periode. Yang tak ditemukan tidak diisi."""
    t = teks(h[h.find("slim-mainpanel"):])
    o = {}
    m = re.search(r"Latitude (-?[\d.,]+)°\s*(LU|LS)?,?\s*Longitude (-?[\d.,]+)°\s*(BT|BB)?\s*dan memiliki ketinggian (-?\d+)", t)
    if m:
        lat, lon = angka(m.group(1)), angka(m.group(3))
        if m.group(2) == "LS" and lat > 0:  # MAGMA menulis tanda minus untuk selatan ('-8.108°LU'); 'LS' tanpa minus dibalik
            lat = -lat
        o.update(lat=lat, lon=lon, tinggi=int(m.group(5)))
    r = t.find("Rekomendasi", t.find("Pengamatan Kegempaan"))
    rek = t[r:t.find("Copyright", r)] if r >= 0 else ""
    rad = [angka(x) for x in re.findall(r"radius\s+(\d+(?:[.,]\d+)?)\s*km", rek, re.I)]
    sek = [angka(x) for x in re.findall(r"(?:sejauh|hingga jarak|jarak)\s+(\d+(?:[.,]\d+)?)\s*km", rek, re.I)]
    if rad:
        o["radius_km"] = max(rad)
    if sek:
        o["sektor_km"] = max(sek)
    if rek:
        o["rekomendasi"] = re.sub(r"^(Rekomendasi\s*)+", "", rek).strip()[:2500]
    m = re.search(r"Laporan Aktivitas Gunung Api - [^,]+, ([^,]+?), periode ([\d:\-]+ \w+)", teks(h))  # judul ada di <title>, sebelum slim-mainpanel
    if m:
        o["periode"] = m.group(1).strip() + ", " + m.group(2)
    return o


def urai_kontak(rek):
    """Teks rekomendasi MAGMA -> {pusat, pos:{nama, telp[], di}} hanya dari yang tertulis di teks (tidak ada daftar pos terstruktur di MAGMA; jangan dikarang). None bila kosong."""
    if not rek:
        return None
    k = {}
    m = re.search(r"\(?022\)?[ -]?7272606", rek)
    if m:
        k["pusat"] = "(022) 7272606"
    m = re.search(r"Pos Pengamatan (Gunung ?[Aa]pi |G\. ?|Gunung )?([A-Z][\w ]{2,30}?) ((?:\(0\d{2,4}\) ?\d{5,}|0\d{9,13})(?: (?:atau|dan) (?:\(0\d{2,4}\) ?\d{5,}|0\d{9,13}))*)(?: di ([^()]+?) \(Provinsi ([^)]+)\))?", rek)
    if m:
        k["pos"] = {"nama": "Pos Pengamatan Gunungapi " + m.group(2).strip(), "telp": re.findall(r"\(0\d{2,4}\) ?\d{5,}|0\d{9,13}", m.group(3))}
        if m.group(4):
            k["pos"]["di"] = f"{m.group(4).strip()}, {m.group(5).strip()}"
    return k or None


def urai_letusan(h):
    """Daftar letusan terbaru -> [{gunung, waktu (ISO, WIB), ket, tinggi_m}] terbaru dulu."""
    out, tgl = [], None
    for b in re.split(r'<div class="timeline-item', h)[1:]:
        m = re.search(r'timeline-date">[^<]*?(\d{1,2}) (\w+) (\d{4})', b)   # judul hari lama berbunyi "Kamis, 15 Oktober 2026, 1 hari yang lalu": jangan mensyaratkan tanda tutup tepat sesudah tahun
        if m:
            tgl = (int(m.group(3)), BULAN.get(m.group(2).lower()), int(m.group(1)))
            continue
        jam = re.search(r"<small>(\d{1,2}):(\d{2}) (WIB|WITA|WIT)", b)
        nm = re.search(r'timeline-title"><a[^>]*>([^<]+)<', b)
        tx = re.search(r'timeline-text">(.*?)</p>', b, re.S)
        if not (tgl and tgl[1] and jam and nm and tx):
            continue
        w = dt.datetime(*tgl, int(jam.group(1)), int(jam.group(2)), tzinfo=dt.timezone(dt.timedelta(hours=ZONA[jam.group(3)])))
        ket = teks(tx.group(1))
        tg = re.search(r"tinggi kolom abu teramati ± ?(\d+) m", ket)
        out.append({"gunung": html.unescape(nm.group(1)).strip(), "waktu": w.astimezone(WIB).isoformat(timespec="minutes"), "ket": ket[:300],
                    **({"tinggi_m": int(tg.group(1))} if tg else {})})
    lihat, uniq = set(), []   # halaman yang digabung saling tumpang tindih; satu letusan = gunung + waktu + awal keterangan
    for x in sorted(out, key=lambda x: x["waktu"], reverse=True):
        k = (x["gunung"], x["waktu"], x["ket"][:60])
        if k not in lihat:
            lihat.add(k); uniq.append(x)
    return uniq


PAPARAN = os.path.join(AKAR, "public/gunungapi/data/paparan.json")
PENDUDUK_SUMBER = "WorldPop 1 km (cincin paparan)"


def penduduk_cincin(cincin, r_km):
    """Jiwa dalam radius r_km dari cincin paparan.json [{km, penduduk}] (3/5/10/15 km, WorldPop 1 km): interpolasi linear menurut r^2 (luas)
    di antara dua cincin; r < 3 km = skala r^2/9 dari cincin 3 km. None bila tak ada cincin atau r > cincin terluar (tidak diekstrapolasi).
    Menggantikan kisi WorldPop 25 km yang melebih-lebihkan sampai 760x pada radius kecil."""
    c = sorted((x["km"], x["penduduk"]) for x in cincin or [])
    if not c or r_km is None or r_km > c[-1][0]:
        return None
    if r_km <= c[0][0]:
        v = c[0][1] * r_km ** 2 / c[0][0] ** 2
    else:
        (a, pa), (b, pb) = next(((c[i], c[i + 1]) for i in range(len(c) - 1) if c[i][0] <= r_km <= c[i + 1][0]))
        v = pa + (pb - pa) * (r_km ** 2 - a ** 2) / (b ** 2 - a ** 2)
    return int(round(v, -2)) if v >= 1000 else int(round(v))


def slug(nama):
    return "-".join("".join(ch for ch in nama.lower() if ch.isalnum() or ch in " -").split())


def baca(jalur, bawaan=None):
    try:
        return json.load(open(jalur))
    except (OSError, ValueError):
        return bawaan


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def riwayat_hari(riwayat, sekarang, gunung, erupsi=None):
    """riwayat tanpa baris hari ini + baris baru (level -> jumlah gunung; erupsi 24 jam hanya bila daftar MAGMA mencapai 24 jam). Simpan 365 hari."""
    hari = sekarang.date().isoformat()
    batas = (sekarang - dt.timedelta(days=365)).date().isoformat()
    baris = {"tgl": hari, "level": {str(l): sum(1 for o in gunung if o["level"] == l) for l in (1, 2, 3, 4)}}
    if erupsi is not None:
        baris["erupsi"] = erupsi
    return [r for r in riwayat if r["tgl"] >= batas and r["tgl"] != hari] + [baris]


def jalan():
    sekarang = dt.datetime.now(WIB)
    daftar = urai_tingkat(ambil("/v1/gunung-api/tingkat-aktivitas"))
    if len(daftar) < 40:  # halaman berubah bentuk: berkas lama dibiarkan, jangan menimpa dengan setengah data
        raise SystemExit(f"hanya {len(daftar)} gunung terurai dari MAGMA; berkas lama dibiarkan")
    kat = baca(KATALOG, {})
    lama = baca(KELUAR, {})
    lv_lama = {g["nama"]: g["level"] for g in lama.get("gunung", [])}
    # Baris riwayat hari ini ditulis SEKARANG dari daftar level (satu permintaan cepat), sebelum laporan per gunung yang lambat (13 menit):
    # job yang terbunuh di tengah (17 dan 18 Okt 2026 bolong) tetap meninggalkan catatan level hari itu. Baris akhir menimpa baris ini.
    if lama.get("gunung"):
        simpan(KELUAR, {**lama, "riwayat": riwayat_hari(lama.get("riwayat", []), sekarang, daftar)})
    gunung = []
    for g in daftar:
        k = kat.get(g["nama"], {})
        lap = {}
        if g["level"] >= 2 or not k.get("lat"):  # laporan hanya diambil untuk level >= II atau gunung yang koordinatnya belum ada
            try:
                lap = urai_laporan(ambil(g["laporan"]))
            except RuntimeError as e:
                print(f"  laporan {g['nama']} gagal: {e}", file=sys.stderr)
            time.sleep(.4)
        if lap.get("lat") is not None and not k.get("lat"):
            k = kat[g["nama"]] = {"prov": g["prov"], "lat": lap["lat"], "lon": lap["lon"], **({"tinggi": lap["tinggi"]} if "tinggi" in lap else {})}
        if k.get("lat") is None:
            continue  # tanpa koordinat tidak bisa dipetakan: dibuang (A18)
        o = {"nama": g["nama"], "prov": g["prov"], "level": g["level"], "lat": k["lat"], "lon": k["lon"], "tinggi": k.get("tinggi"), "laporan": g["laporan"].split("?")[0]}
        if g["level"] >= 2:  # radius hanya bermakna saat ada rekomendasi pembatasan
            o.update({x: lap[x] for x in ("radius_km", "sektor_km", "periode", "rekomendasi") if x in lap})
            if urai_kontak(lap.get("rekomendasi")):
                o["kontak"] = urai_kontak(lap["rekomendasi"])
        gunung.append(o)
    cinc = {g["id"]: g.get("cincin") for g in (baca(PAPARAN, {}) or {}).get("gunung", [])}
    for o in gunung:
        if o.get("radius_km"):  # gunung tanpa cincin paparan: null (bukan angka kisi kasar)
            o["penduduk_radius"] = penduduk_cincin(cinc.get(slug(o["nama"])), o["radius_km"])
            o["penduduk_sumber"] = PENDUDUK_SUMBER
    # perubahan level: dibandingkan dengan berkas sebelumnya; riwayat dipertahankan 90 hari
    batas = (sekarang - dt.timedelta(days=90)).date().isoformat()
    perubahan = [p for p in lama.get("perubahan", []) if p["tgl"] >= batas]
    for o in gunung:
        a = lv_lama.get(o["nama"])
        if a and a != o["level"]:
            perubahan.append({"nama": o["nama"], "dari": a, "ke": o["level"], "tgl": sekarang.date().isoformat()})
    letusan, cak = lama.get("letusan", []), lama.get("letusan_cakupan")   # gagal baca: daftar lama tampil, tapi cakupannya TIDAK diperpanjang
    h, baru = "", []
    try:
        for hal in range(1, 9):  # halaman 1 memuat ±15 letusan (Ibu bisa belasan per hari): ambil mundur sampai melewati 24 jam, paling banyak 8 halaman
            h += ambil(f"/v1/gunung-api/informasi-letusan?page={hal}")  # digabung dulu: tanggal hanya ditulis di awal tiap hari, kadang tak ikut di awal halaman berikut
            baru = urai_letusan(h)
            if not baru or dt.datetime.fromisoformat(baru[-1]["waktu"]) < sekarang - dt.timedelta(hours=24):
                break
            time.sleep(.4)
    except RuntimeError as e:   # halaman yang sudah terbaca tetap dipakai (cakupannya sampai letusan tertua yang terbaca saja)
        print(f"  letusan gagal: {e}", file=sys.stderr)
    letusan, cak = gabung_letusan(baru, lama.get("letusan", []), lama.get("letusan_cakupan"), sekarang)
    simpan(KATALOG, dict(sorted(kat.items())))
    n_lv = {l: sum(1 for o in gunung if o["level"] == l) for l in (1, 2, 3, 4)}
    # riwayat harian (satu baris per tanggal WIB, diganti bila jalan lagi di hari sama): jumlah gunung per level + erupsi 24 jam; layar Tren menggambarnya setelah >= 2 hari
    r24 = sum(1 for x in letusan if dt.datetime.fromisoformat(x["waktu"]) >= sekarang - dt.timedelta(hours=24))
    lengkap = bool(cak) and dt.datetime.fromisoformat(cak["dari"]) <= sekarang - dt.timedelta(hours=24) and dt.datetime.fromisoformat(cak["sampai"]) >= sekarang - dt.timedelta(minutes=30)   # hanya bila cakupan yang TERBUKTI (bukan daftar lama) meliputi 24 jam terakhir
    riwayat = riwayat_hari(lama.get("riwayat", []), sekarang, gunung, r24 if lengkap else None)
    simpan(KELUAR, {"sumber": "MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)", "dibuat": sekarang.isoformat(timespec="seconds"),
                    "jumlah_level": {str(l): n for l, n in n_lv.items()}, "gunung": gunung, "perubahan": perubahan, "letusan": letusan, **({"letusan_cakupan": cak} if cak else {}), "riwayat": riwayat})
    print(f"{len(gunung)} gunung; level {n_lv}; letusan {len(letusan)}; perubahan {len(perubahan)}", file=sys.stderr)


def gabung_letusan(baru, lama, cak_lama, sekarang):
    """Letusan hasil baca sekarang + letusan lama (bila cakupan lama bersambung) -> (daftar maks 150, cakupan {dari, sampai}).
    Cakupan = rentang yang TERBUKTI terbaca: dari = letusan tertua halaman, sampai = sekarang. Tanpa letusan terbaca, tak ada bukti: lama dipertahankan."""
    if not baru:
        return lama, cak_lama
    dari = baru[-1]["waktu"]
    sam = sekarang.isoformat(timespec="minutes")
    if cak_lama and cak_lama["sampai"] >= dari:   # lama bersambung dengan yang baru: cakupan melebar ke belakang
        dari = min(dari, cak_lama["dari"])
        baru = baru + [x for x in lama if x["waktu"] >= dari]
    lihat, uniq = set(), []
    for x in sorted(baru, key=lambda x: x["waktu"], reverse=True):
        k = (x["gunung"], x["waktu"], x["ket"][:60])
        if k not in lihat:
            lihat.add(k); uniq.append(x)
    if len(uniq) > 150:
        uniq = uniq[:150]
        dari = max(dari, uniq[-1]["waktu"])
    return uniq, {"dari": dari, "sampai": sam}


def uji():
    h = ('<a href="" class="tx-inverse tx-14 tx-medium d-block">Level IV (Awas)</a><td>Tidak ada gunung api Level IV (Awas)</td>'
         '<a href="" class="tx-inverse tx-14 tx-medium d-block">Level III (Siaga)</a><tr><td>\n Semeru - Jawa Timur <a href="https://x/laporan/1?signature=a&amp;b=2"><i></i></a></td></tr>'
         '<a href="" class="tx-inverse tx-14 tx-medium d-block">Level I (Normal)</a><tr><td> Kerinci - Jambi, Sumatera Barat <a href="https://x/laporan/2?s=1">z</a></td></tr>')
    d = urai_tingkat(h)
    assert [(g["nama"], g["prov"], g["level"]) for g in d] == [("Semeru", "Jawa Timur", 3), ("Kerinci", "Jambi, Sumatera Barat", 1)], d
    assert d[0]["laporan"] == "https://x/laporan/1?signature=a&b=2"
    lap = ('<title>Laporan Aktivitas Gunung Api - Semeru, Jumat - 16 Oktober 2026, periode 06:00-12:00 WIB</title><div class="slim-mainpanel">Laporan Aktivitas Gunung Api - Semeru, Jumat - 16 Oktober 2026, periode 06:00-12:00 WIB '
           'Gunung Api Semeru terletak di Lumajang dengan posisi geografis di Latitude -8.108°LU, Longitude 112.92°BT dan memiliki ketinggian 3676 mdpl '
           'Pengamatan Kegempaan 25 kali Rekomendasi Rekomendasi 1. Tidak melakukan aktivitas apapun di sektor tenggara sejauh 13 km dari puncak. '
           '2. Tidak beraktivitas dalam radius 5 Km dari kawah. Copyright 2026</div>')
    r = urai_laporan(lap)
    assert (r["lat"], r["lon"], r["tinggi"], r["radius_km"], r["sektor_km"]) == (-8.108, 112.92, 3676, 5, 13), r
    assert urai_laporan("slim-mainpanel Latitude -8.5444°LU, Longitude 123.585°BT dan memiliki ketinggian -50 mdpl")["tinggi"] == -50  # gunung bawah laut
    assert r["rekomendasi"].startswith("1. Tidak") and r["periode"].startswith("Jumat - 16 Oktober 2026"), r
    ev = ('<div class="timeline-item timeline-day"><p class="timeline-date">Hari Ini, Jumat, 16 Oktober 2026</p></div>'
          '<div class="timeline-item"><small>14:43 WITA </small><p class="timeline-title"><a href="#">Ili Lewotolok</a></p>'
          '<p class="timeline-text"> Terjadi erupsi dengan tinggi kolom abu teramati ± 400 m di atas puncak. </p></div>')
    e = urai_letusan(ev)
    assert e == [{"gunung": "Ili Lewotolok", "waktu": "2026-10-16T13:43+07:00", "ket": "Terjadi erupsi dengan tinggi kolom abu teramati ± 400 m di atas puncak.", "tinggi_m": 400}], e
    dua = ('<div class="timeline-item timeline-day"><p class="timeline-date">Hari Ini, Jumat, 16 Oktober 2026</p></div>'
           '<div class="timeline-item"><small>10:00 WIB </small><p class="timeline-title"><a href="#">Semeru</a></p><p class="timeline-text"> Erupsi A. </p></div>'
           '<div class="timeline-item timeline-day"><p class="timeline-date">Kamis, 15 Oktober 2026, 1 hari yang lalu</p></div>'
           '<div class="timeline-item"><small>23:42 WIB </small><p class="timeline-title"><a href="#">Semeru</a></p><p class="timeline-text"> Erupsi B. </p></div>'
           '<div class="timeline-item timeline-day"><p class="timeline-date">Kamis, 15 Oktober 2026, 1 hari yang lalu</p></div>'
           '<div class="timeline-item"><small>23:42 WIB </small><p class="timeline-title"><a href="#">Semeru</a></p><p class="timeline-text"> Erupsi B. </p></div>')
    d2 = urai_letusan(dua)   # judul hari dengan akhiran "N hari yang lalu" tetap terbaca; halaman tumpang tindih tidak menggandakan
    assert [x["waktu"] for x in d2] == ["2026-10-16T10:00+07:00", "2026-10-15T23:42+07:00"], d2
    live = urai_letusan(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh/informasi_letusan_20261019.html"), encoding="utf-8").read())   # halaman live 19 Okt 02.30 WIB (halaman 1-3)
    per_hari = {}
    for x in live:
        per_hari[x["waktu"][:10]] = per_hari.get(x["waktu"][:10], 0) + 1
    assert per_hari == {"2026-10-17": 15, "2026-10-18": 13, "2026-10-19": 2}, per_hari   # letusan 18 Okt ("Minggu, 18 Oktober 2026, 1 hari yang lalu") wajib terbaca
    now = dt.datetime.fromisoformat("2026-10-19T02:39+07:00")
    lamax = [{"gunung": "Semeru", "waktu": "2026-10-15T10:00+07:00", "ket": "lama"}]
    ls, ck = gabung_letusan(live, lamax, {"dari": "2026-10-14T00:00+07:00", "sampai": "2026-10-18T00:00+07:00"}, now)
    assert ck == {"dari": "2026-10-14T00:00+07:00", "sampai": "2026-10-19T02:39+07:00"} and len(ls) == 31, ck   # lama bersambung: cakupan melebar
    ls, ck = gabung_letusan(live, lamax, {"dari": "2026-10-10T00:00+07:00", "sampai": "2026-10-12T00:00+07:00"}, now)
    assert ck["dari"] == live[-1]["waktu"] and len(ls) == 30, ck   # lama terputus: dibuang, cakupan hanya yang terbukti
    assert gabung_letusan([], lamax, {"dari": "a", "sampai": "b"}, now) == (lamax, {"dari": "a", "sampai": "b"})   # gagal baca: cakupan tidak diperpanjang
    merapi = [{"km": 3, "penduduk": 40}, {"km": 5, "penduduk": 15122}, {"km": 10, "penduduk": 184363}, {"km": 15, "penduduk": 570744}]  # cincin nyata paparan.json
    assert penduduk_cincin(merapi, 3) == 40 and penduduk_cincin(merapi, 5) == 15100, "Merapi 3/5 km harus tepat cincin"   # puluhan, bukan 30.400 (kisi 25 km)
    assert penduduk_cincin(merapi, 1.5) == 10 and penduduk_cincin(merapi, 4) < 15122 and 15122 < penduduk_cincin(merapi, 7) < 184363
    assert penduduk_cincin(merapi, 4) == int(round(40 + (15122 - 40) * 7 / 16, -2)), penduduk_cincin(merapi, 4)   # interpolasi menurut r^2
    assert penduduk_cincin(merapi, 20) is None and penduduk_cincin(None, 5) is None and penduduk_cincin([], 5) is None
    rk = ("5. Untuk mengetahui informasi dapat menghubungi Pusat Vulkanologi dan Mitigasi Bencana Geologi, Badan Geologi (022) 7272606 di Bandung (Provinsi Jawa Barat) atau "
          "Pos Pengamatan Gunungapi Krakatau (0254) 651449 atau 085846324506 di Pasauran (Provinsi Banten).")
    assert urai_kontak(rk) == {"pusat": "(022) 7272606", "pos": {"nama": "Pos Pengamatan Gunungapi Krakatau", "telp": ["(0254) 651449", "085846324506"], "di": "Pasauran, Banten"}}, urai_kontak(rk)
    assert urai_kontak("hubungi Pos Pengamatan Gunung api Sinabung") is None and urai_kontak(None) is None and urai_kontak("PVMBG pada nomor telepon 022-7272606") == {"pusat": "(022) 7272606"}
    sk = dt.datetime(2026, 10, 19, 5, tzinfo=WIB)   # riwayat: baris hari ini diganti, bukan digandakan; bolong 17-18 Okt dibiarkan
    r0 = [{"tgl": "2026-10-16", "level": {"1": 1}}, {"tgl": "2026-10-19", "level": {"1": 9}}]
    r1 = riwayat_hari(r0, sk, [{"level": 3}, {"level": 1}, {"level": 1}], 4)
    assert [r["tgl"] for r in r1] == ["2026-10-16", "2026-10-19"] and r1[-1] == {"tgl": "2026-10-19", "level": {"1": 2, "2": 0, "3": 1, "4": 0}, "erupsi": 4}, r1
    assert "erupsi" not in riwayat_hari(r1, sk, [{"level": 3}])[-1]
    assert slug("Lewotobi Laki-laki") == "lewotobi-laki-laki" and slug("Anak Krakatau") == "anak-krakatau"
    print("ok")


def rantai():
    """Sesudah status tertulis: abu.py, prospektif.py (catatan append-only arah abu vs VONA, butuh abu_gunungapi.json baru), lalu laporan.py. Gagal = peringatan, berkas lama dibiarkan, exit tetap 0."""
    import subprocess
    d = os.path.dirname(os.path.abspath(__file__))
    for nama in ("abu.py", "prospektif.py", "laporan.py"):
        s = os.path.join(d, nama)
        if os.path.exists(s) and (subprocess.call([sys.executable, s, "uji"]) != 0 or subprocess.call([sys.executable, s]) != 0):
            print(f"::warning title=gunungapi::{nama} gagal; berkas lamanya dibiarkan", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        jalan()  # gagal membaca MAGMA = SystemExit, tanpa rantai
        rantai()
